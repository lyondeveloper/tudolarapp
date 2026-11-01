import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { ACCESS_TOKEN_ISSUER } from '../../src/auth/application/auth.tokens';
import type { AccessTokenIssuerPort } from '../../src/auth/application/auth.ports';

interface JsonResponse {
  body: unknown;
}

interface SearchOfferItemPayload {
  id: string;
  pairId: string;
  distanceMeters: number | null;
  status: string;
  description: string;
  details: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  currentTermsVersionId: string;
  terms: {
    version: number;
    giveAmount: string;
    receiveAmount: string;
    rate: string | null;
    marginPct: string;
    minAmount: string;
    maxAmount: string;
    expiresAt: string;
  };
}

interface SearchOffersResponsePayload {
  items: SearchOfferItemPayload[];
  nextCursor: string | null;
}

interface PublishedOfferPayload {
  id: string;
}

function responseBody<Body>(response: JsonResponse): Body {
  return response.body as Body;
}

describe('Geospatial Search with PostGIS (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenIssuer: AccessTokenIssuerPort;

  // Locations inside Ciudad Ojeda
  const ojedaMall = { latitude: 10.1969, longitude: -71.3081 };
  const plazaBolivar = { latitude: 10.201, longitude: -71.312 }; // ~600m from Ojeda Mall

  let testUserId: string;
  let offerId1: string;
  let offerId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    tokenIssuer = app.get<AccessTokenIssuerPort>(ACCESS_TOKEN_ISSUER);

    // Create eligible seller user
    const user = await prisma.user.create({
      data: {
        displayName: 'Search Test Seller',
        username: 'search_test_seller',
        usernameNormalized: 'search_test_seller',
        email: 'search_test@example.com',
        emailNormalized: 'search_test@example.com',
        emailVerifiedAt: new Date(),
        accountStatus: 'active',
      },
    });
    testUserId = user.id;

    const token = await tokenIssuer.issue(testUserId, 'session-search-test');

    // Onboard seller
    await request(app.getHttpServer())
      .post('/sellers/onboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Publish Offer 1: VES_USDT at Ojeda Mall
    const offerRes1 = await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .send({
        pairId: 'VES_USDT',
        initialAmount: '1000.00',
        giveAmount: '100.00',
        receiveAmount: '2.500000',
        minAmount: '10.00',
        maxAmount: '500.00',
        rate: '0.02500000',
        marginPct: '0.00',
        description: 'Venta de bolívares por USDT en Ojeda Mall',
        details: 'Feria de comida',
        location: ojedaMall,
      })
      .expect(201);
    offerId1 = responseBody<PublishedOfferPayload>(offerRes1).id;

    // Publish Offer 2: USDT_VES at Plaza Bolívar
    const offerRes2 = await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .send({
        pairId: 'USDT_VES',
        initialAmount: '500.00',
        giveAmount: '50.00',
        receiveAmount: '2000.00',
        minAmount: '10.00',
        maxAmount: '200.00',
        rate: '40.00000000',
        marginPct: '0.00',
        description: 'Cambio de USDT por efectivo en Plaza Bolívar',
        details: 'Cerca de la estatua',
        location: plazaBolivar,
      })
      .expect(201);
    offerId2 = responseBody<PublishedOfferPayload>(offerRes2).id;
  });

  afterAll(async () => {
    if (offerId1) {
      await prisma.$executeRaw`DELETE FROM offers WHERE id = ${offerId1}::uuid`;
    }
    if (offerId2) {
      await prisma.$executeRaw`DELETE FROM offers WHERE id = ${offerId2}::uuid`;
    }
    if (testUserId) {
      await prisma.sellerEligibility.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }
    await app.close();
  });

  it('searches offers by proximity and sorts ascending by distance', async () => {
    const res = await request(app.getHttpServer())
      .get('/search/offers')
      .set('X-Market-Id', 'ciudad-ojeda')
      .query({
        latitude: ojedaMall.latitude,
        longitude: ojedaMall.longitude,
        radiusKm: 5,
      })
      .expect(200);

    const body = responseBody<SearchOffersResponsePayload>(res);
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThanOrEqual(2);

    const match1 = body.items.find((item) => item.id === offerId1);
    const match2 = body.items.find((item) => item.id === offerId2);

    expect(match1).toBeDefined();
    expect(match2).toBeDefined();

    // Offer 1 should be right at Ojeda Mall (~0 meters)
    expect(match1!.distanceMeters).toBeLessThan(50);

    // Offer 2 should be at Plaza Bolívar (~600 meters)
    expect(match2!.distanceMeters).toBeGreaterThan(400);
    expect(match2!.distanceMeters).toBeLessThan(1000);

    // Offer 1 comes before Offer 2 because it is closer
    const index1 = body.items.findIndex((item) => item.id === offerId1);
    const index2 = body.items.findIndex((item) => item.id === offerId2);
    expect(index1).toBeLessThan(index2);
  });

  it('filters offers by pairId', async () => {
    const res = await request(app.getHttpServer())
      .get('/search/offers')
      .set('X-Market-Id', 'ciudad-ojeda')
      .query({
        latitude: ojedaMall.latitude,
        longitude: ojedaMall.longitude,
        pairId: 'VES_USDT',
        radiusKm: 5,
      })
      .expect(200);

    const body = responseBody<SearchOffersResponsePayload>(res);
    const foundOffer1 = body.items.some((item) => item.id === offerId1);
    const foundOffer2 = body.items.some((item) => item.id === offerId2);

    expect(foundOffer1).toBe(true);
    expect(foundOffer2).toBe(false);
  });

  it('excludes offers outside the proximity radius', async () => {
    // Radius of 100 meters around Ojeda Mall: excludes Plaza Bolivar (~600m)
    const res = await request(app.getHttpServer())
      .get('/search/offers')
      .set('X-Market-Id', 'ciudad-ojeda')
      .query({
        latitude: ojedaMall.latitude,
        longitude: ojedaMall.longitude,
        radiusKm: 0.1,
      })
      .expect(200);

    const body = responseBody<SearchOffersResponsePayload>(res);
    const foundOffer1 = body.items.some((item) => item.id === offerId1);
    const foundOffer2 = body.items.some((item) => item.id === offerId2);

    expect(foundOffer1).toBe(true);
    expect(foundOffer2).toBe(false);
  });

  it('rejects search requests missing X-Market-Id header', async () => {
    await request(app.getHttpServer())
      .get('/search/offers')
      .query({
        latitude: ojedaMall.latitude,
        longitude: ojedaMall.longitude,
      })
      .expect(400);
  });

  it('rejects invalid coordinate bounds', async () => {
    await request(app.getHttpServer())
      .get('/search/offers')
      .set('X-Market-Id', 'ciudad-ojeda')
      .query({
        latitude: 100, // Invalid latitude (> 90)
        longitude: -71.3081,
      })
      .expect(400);
  });

  it('rejects radius exceeding max limit (> 50 km)', async () => {
    await request(app.getHttpServer())
      .get('/search/offers')
      .set('X-Market-Id', 'ciudad-ojeda')
      .query({
        latitude: ojedaMall.latitude,
        longitude: ojedaMall.longitude,
        radiusKm: 60,
      })
      .expect(400);
  });

  it('rejects unapproved trading pairs', async () => {
    await request(app.getHttpServer())
      .get('/search/offers')
      .set('X-Market-Id', 'ciudad-ojeda')
      .query({
        pairId: 'VES_ZELLE',
      })
      .expect(400);
  });
});
