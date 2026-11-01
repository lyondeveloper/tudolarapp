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

interface PublishedOfferPayload {
  id: string;
  pairId: string;
  currentTermsVersionId: string;
  status: string;
  description: string;
  details: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
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

function responseBody<Body>(response: JsonResponse): Body {
  return response.body as Body;
}

describe('Offers Publishing in Ciudad Ojeda (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenIssuer: AccessTokenIssuerPort;

  const ojedaInsidePoint = { latitude: 10.1969, longitude: -71.3081 };
  const cabimasOutsidePoint = { latitude: 10.4, longitude: -71.44 };

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces eligibility, entitlement, boundary containment, and atomic terms versioning', async () => {
    // 1. Create unverified user (ineligible)
    const ineligibleUser = await prisma.user.create({
      data: {
        displayName: 'Ineligible Seller',
        username: 'ineligible_seller',
        usernameNormalized: 'ineligible_seller',
        email: 'ineligible@example.com',
        emailNormalized: 'ineligible@example.com',
        accountStatus: 'active',
      },
    });

    const ineligibleToken = await tokenIssuer.issue(
      ineligibleUser.id,
      'session-ineligible',
    );

    // 2. Create eligible seller (verified email + onboarded)
    const eligibleUser = await prisma.user.create({
      data: {
        displayName: 'Eligible Seller Ojeda',
        username: 'eligible_seller',
        usernameNormalized: 'eligible_seller',
        email: 'eligible@example.com',
        emailNormalized: 'eligible@example.com',
        emailVerifiedAt: new Date(),
        accountStatus: 'active',
      },
    });

    const eligibleToken = await tokenIssuer.issue(
      eligibleUser.id,
      'session-eligible',
    );

    // Onboard eligible seller
    await request(app.getHttpServer())
      .post('/sellers/onboard')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .expect(200);

    const validOfferPayload = {
      pairId: 'VES_USDT',
      initialAmount: '1000.00',
      giveAmount: '100.00',
      receiveAmount: '2.500000',
      minAmount: '10.00',
      maxAmount: '500.00',
      rate: '0.02500000',
      marginPct: '0.00',
      description: 'Venta de bolivares por USDT en Ojeda Mall',
      details: 'Encuentro diurno en feria de comida',
      location: ojedaInsidePoint,
    };

    // 3. Ineligible seller attempts to publish -> 403 Forbidden
    await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${ineligibleToken}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .send(validOfferPayload)
      .expect(403);

    // 4. Request without X-Market-Id -> 400 Bad Request
    await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .send(validOfferPayload)
      .expect(400);

    // 5. Unapproved pair -> 400 Bad Request
    await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .send({
        ...validOfferPayload,
        pairId: 'VES_ZELLE',
      })
      .expect(400);

    // 6. Coordinates outside Ciudad Ojeda boundary -> 422 Unprocessable Entity
    await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .send({
        ...validOfferPayload,
        location: cabimasOutsidePoint,
      })
      .expect(422);

    // 7. Successful publication with eligible seller inside Ciudad Ojeda boundary -> 201 Created
    const publishRes = await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${eligibleToken}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .send(validOfferPayload)
      .expect(201);

    const body = responseBody<PublishedOfferPayload>(publishRes);
    expect(body.id).toBeDefined();
    expect(body.pairId).toBe('VES_USDT');
    expect(body.currentTermsVersionId).toBeDefined();
    expect(body.status).toBe('active');
    expect(body.terms.version).toBe(1);
    expect(body.terms.giveAmount).toBe('100.00');
    expect(body.terms.receiveAmount).toBe('2.500000');
    expect(body.location.latitude).toBe(ojedaInsidePoint.latitude);
    expect(body.location.longitude).toBe(ojedaInsidePoint.longitude);

    // 8. Verify database state
    const termsRows = await prisma.offerTermsVersion.findMany({
      where: { offerId: body.id },
    });
    expect(termsRows).toHaveLength(1);
    expect(termsRows[0].version).toBe(1);
    expect(termsRows[0].pairId).toBe('VES_USDT');

    // Clean up
    await prisma.$executeRaw`DELETE FROM offers WHERE id = ${body.id}::uuid`;
    await prisma.sellerEligibility.deleteMany({
      where: { userId: { in: [ineligibleUser.id, eligibleUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [ineligibleUser.id, eligibleUser.id] } },
    });
  });
});
