import { Controller, Get, INestApplication, Param, Req } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Request } from 'express';
import { AppModule } from '../../src/app.module';
import { MarketsModule } from '../../src/markets/markets.module';
import { MarketScoped } from '../../src/common/market-context/market-scoped.decorator';
import { assertMarketMatch } from '../../src/common/market-context/market-isolation';
import { ApiErrorCode } from '../../src/common/errors/api-error-code';
import { PrismaService } from '../../src/database/prisma.service';
import { Public } from '../../src/auth/adapters/in/http/auth.decorators';
import { ACCESS_TOKEN_ISSUER } from '../../src/auth/application/auth.tokens';
import type { AccessTokenIssuerPort } from '../../src/auth/application/auth.ports';

interface MarketScopedRequest extends Request {
  marketId: string;
}

interface JsonResponse {
  body: unknown;
}

interface ErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

interface MarketPayload {
  marketId: string;
}

interface SuccessPayload {
  ok: boolean;
  marketId: string;
}

function responseBody<Body>(response: JsonResponse): Body {
  return response.body as Body;
}

@Controller('test-market-scope')
class TestMarketScopeController {
  @Get()
  @Public()
  @MarketScoped()
  testScopedRoute(@Req() req: MarketScopedRequest) {
    return { marketId: req.marketId };
  }

  @Get('cross-market/:entityMarketId')
  @Public()
  @MarketScoped()
  testCrossMarketRoute(
    @Req() req: MarketScopedRequest,
    @Param('entityMarketId') entityMarketId: string,
  ) {
    assertMarketMatch(req.marketId, entityMarketId);
    return { ok: true, marketId: req.marketId };
  }

  @Get('protected')
  @MarketScoped()
  testProtectedScopedRoute(@Req() req: MarketScopedRequest) {
    return { marketId: req.marketId };
  }
}

describe('Market Isolation & Scoped Routes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenIssuer: AccessTokenIssuerPort;
  let validJwt: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, MarketsModule],
      controllers: [TestMarketScopeController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    tokenIssuer = app.get<AccessTokenIssuerPort>(ACCESS_TOKEN_ISSUER);
    validJwt = await tokenIssuer.issue('user-test-e2e', 'session-test-e2e');

    // Ensure Ciudad Ojeda market exists in the test DB
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

  it('allows un-scoped routes (such as health check) without any X-Market-Id header', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(responseBody<{ status: string }>(response)).toEqual({
      status: 'ok',
    });
  });

  it('rejects market-scoped route with 400 MARKET_ID_REQUIRED when X-Market-Id is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope')
      .expect(400);

    const body = responseBody<ErrorPayload>(response);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(ApiErrorCode.MARKET_ID_REQUIRED);
  });

  it('rejects market-scoped route with 400 MARKET_NOT_FOUND when market is unknown', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope')
      .set('X-Market-Id', 'unknown-market')
      .expect(400);

    const body = responseBody<ErrorPayload>(response);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(ApiErrorCode.MARKET_NOT_FOUND);
  });

  it('accepts market-scoped route with 200 when X-Market-Id matches active market', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope')
      .set('X-Market-Id', 'ciudad-ojeda')
      .expect(200);

    expect(responseBody<MarketPayload>(response)).toEqual({
      marketId: 'ciudad-ojeda',
    });
  });

  it('rejects cross-market access with 403 MARKET_MISMATCH via assertMarketMatch', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope/cross-market/maracaibo')
      .set('X-Market-Id', 'ciudad-ojeda')
      .expect(403);

    const body = responseBody<ErrorPayload>(response);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(ApiErrorCode.MARKET_MISMATCH);
    expect(body.error.message).toBe(
      'The requested operation violates market isolation',
    );
  });

  it('allows same-market access with 200 via assertMarketMatch', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope/cross-market/ciudad-ojeda')
      .set('X-Market-Id', 'ciudad-ojeda')
      .expect(200);

    expect(responseBody<SuccessPayload>(response)).toEqual({
      ok: true,
      marketId: 'ciudad-ojeda',
    });
  });

  it('rejects protected market-scoped route with 401 when unauthenticated', async () => {
    await request(app.getHttpServer())
      .get('/test-market-scope/protected')
      .set('X-Market-Id', 'ciudad-ojeda')
      .expect(401);
  });

  it('rejects protected market-scoped route with 400 MARKET_ID_REQUIRED when authenticated but header is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope/protected')
      .set('Authorization', `Bearer ${validJwt}`)
      .expect(400);

    const body = responseBody<ErrorPayload>(response);
    expect(body.error.code).toBe(ApiErrorCode.MARKET_ID_REQUIRED);
  });

  it('accepts protected market-scoped route with 200 when both authenticated and valid market header provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-market-scope/protected')
      .set('Authorization', `Bearer ${validJwt}`)
      .set('X-Market-Id', 'ciudad-ojeda')
      .expect(200);

    expect(responseBody<MarketPayload>(response)).toEqual({
      marketId: 'ciudad-ojeda',
    });
  });
});
