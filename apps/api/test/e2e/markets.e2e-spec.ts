import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';
import {
  MARKET_REPOSITORY,
  MarketRepositoryPort,
} from './../../src/markets/application/markets.ports';
import {
  MARKET_CONTEXT_PORT,
  MarketContextPort,
} from './../../src/common/market-context/market-context.port';

describe('markets geographic scope (e2e)', () => {
  let app: INestApplication;
  let marketRepo: MarketRepositoryPort;
  let marketContext: MarketContextPort;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    marketRepo = app.get<MarketRepositoryPort>(MARKET_REPOSITORY);
    marketContext = app.get<MarketContextPort>(MARKET_CONTEXT_PORT);
    prisma = app.get(PrismaService);

    // Ensure Ciudad Ojeda market exists
    await prisma.$executeRaw`
      INSERT INTO "markets" ("id", "name", "description", "boundary", "is_active", "attribution")
      VALUES (
        'ciudad-ojeda',
        'Ciudad Ojeda',
        'Mercado piloto Ciudad Ojeda (Municipio Lagunillas, Zulia)',
        ST_GeomFromText('POLYGON((-71.36 10.16, -71.33 10.26, -71.22 10.26, -71.18 10.16, -71.28 10.10, -71.36 10.16))', 4326),
        true,
        '© OpenStreetMap contributors'
      ) ON CONFLICT ("id") DO NOTHING;
    `;
  });

  afterAll(async () => {
    await app.close();
  });

  it('resolves market existence and metadata for the seeded Ciudad Ojeda pilot market', async () => {
    const existsInContext = await marketContext.exists('ciudad-ojeda');
    expect(existsInContext).toBe(true);

    const existsInRepo = await marketRepo.exists('ciudad-ojeda');
    expect(existsInRepo).toBe(true);

    const market = await marketRepo.findById('ciudad-ojeda');
    expect(market).not.toBeNull();
    expect(market?.id).toBe('ciudad-ojeda');
    expect(market?.name).toBe('Ciudad Ojeda');
    expect(market?.isActive).toBe(true);
    expect(market?.attribution).toBe('© OpenStreetMap contributors');
    expect(market?.boundary.type).toBe('Polygon');
    expect(market?.boundary.coordinates[0].length).toBeGreaterThanOrEqual(4);
  });

  it('lists Ciudad Ojeda among active markets', async () => {
    const activeMarkets = await marketRepo.findAllActive();
    expect(activeMarkets.length).toBeGreaterThanOrEqual(1);

    const ojeda = activeMarkets.find((m) => m.id === 'ciudad-ojeda');
    expect(ojeda).toBeDefined();
    expect(ojeda?.name).toBe('Ciudad Ojeda');
    expect(ojeda?.isActive).toBe(true);
  });

  it('correctly validates coordinates inside the Ciudad Ojeda market polygon', async () => {
    // Downtown Ciudad Ojeda reference point
    const insidePoint = { longitude: -71.3081, latitude: 10.1969 };
    const isCovered = await marketRepo.containsPoint(
      'ciudad-ojeda',
      insidePoint,
    );
    expect(isCovered).toBe(true);
  });

  it('is boundary-inclusive: coordinates on the boundary edge are covered', async () => {
    // An exact vertex of the polygon: (-71.36, 10.16)
    const edgePoint = { longitude: -71.36, latitude: 10.16 };
    const isCovered = await marketRepo.containsPoint('ciudad-ojeda', edgePoint);
    expect(isCovered).toBe(true);
  });

  it('rejects coordinates outside the Ciudad Ojeda market polygon', async () => {
    // Cabimas (deferred pilot area, outside Lagunillas polygon)
    const cabimasPoint = { longitude: -71.44, latitude: 10.4 };
    expect(await marketRepo.containsPoint('ciudad-ojeda', cabimasPoint)).toBe(
      false,
    );

    // Maracaibo (outside Lagunillas polygon)
    const maracaiboPoint = { longitude: -71.64, latitude: 10.64 };
    expect(await marketRepo.containsPoint('ciudad-ojeda', maracaiboPoint)).toBe(
      false,
    );

    // Lake Maracaibo offshore
    const lakePoint = { longitude: -71.55, latitude: 10.2 };
    expect(await marketRepo.containsPoint('ciudad-ojeda', lakePoint)).toBe(
      false,
    );
  });

  it('returns false for unknown markets or invalid coordinates', async () => {
    expect(await marketRepo.exists('non-existent-market')).toBe(false);
    expect(await marketRepo.findById('non-existent-market')).toBeNull();

    const insidePoint = { longitude: -71.3081, latitude: 10.1969 };
    expect(
      await marketRepo.containsPoint('non-existent-market', insidePoint),
    ).toBe(false);

    // Out-of-range coordinates
    expect(
      await marketRepo.containsPoint('ciudad-ojeda', {
        longitude: 999,
        latitude: 999,
      }),
    ).toBe(false);
  });
});
