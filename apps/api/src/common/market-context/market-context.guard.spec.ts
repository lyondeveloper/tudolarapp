import 'reflect-metadata';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Req,
  UseGuards,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../errors/all-exceptions.filter';
import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';
import { MarketScoped } from './market-scoped.decorator';
import { MarketContextGuard } from './market-context.guard';
import { MARKET_CONTEXT_PORT } from './market-context.port';

const KNOWN_MARKET = 'ciudad-ojeda';

interface MarketScopedRequest {
  marketId?: string;
}

class DummyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer valid-token')) {
      throw new ApplicationError(ApiErrorCode.UNAUTHORIZED);
    }
    return true;
  }
}

@Controller('market-context')
class MarketContextController {
  @Get('offers')
  @MarketScoped()
  listOffers(@Req() req: MarketScopedRequest): { marketId: string | null } {
    return { marketId: req.marketId ?? null };
  }

  @Get('protected-offers')
  @UseGuards(DummyAuthGuard, MarketContextGuard)
  protectedOffers(@Req() req: MarketScopedRequest): {
    marketId: string | null;
  } {
    return { marketId: req.marketId ?? null };
  }

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

interface EnvelopeBody {
  error: { code: unknown; message: unknown };
  requestId: unknown;
}

function bodyOf(response: { body: unknown }): EnvelopeBody {
  return response.body as EnvelopeBody;
}

describe('MarketContextGuard', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MarketContextController],
      providers: [
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        {
          provide: MARKET_CONTEXT_PORT,
          useValue: {
            exists: (marketId: string) =>
              Promise.resolve(marketId === KNOWN_MARKET),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a missing X-Market-Id with a coded 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/market-context/offers')
      .expect(400);

    expect(bodyOf(response).error).toEqual({
      code: ApiErrorCode.MARKET_ID_REQUIRED,
      message: 'The X-Market-Id header is required',
    });
  });

  it('rejects an unknown market with a coded 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/market-context/offers')
      .set('X-Market-Id', 'atlantis')
      .expect(400);

    expect(bodyOf(response).error.code).toBe(ApiErrorCode.MARKET_NOT_FOUND);
  });

  it('never defaults to all markets: a blank header is still a missing market', async () => {
    await request(app.getHttpServer())
      .get('/market-context/offers')
      .set('X-Market-Id', '   ')
      .expect(400);

    const response = await request(app.getHttpServer())
      .get('/market-context/offers')
      .expect(400);

    // The route never runs, so it cannot observe an "all markets" default.
    expect(bodyOf(response).error.code).toBe(ApiErrorCode.MARKET_ID_REQUIRED);
    expect(JSON.stringify(response.body)).not.toContain('"marketId"');
  });

  it('attaches the validated market to the request', async () => {
    const response = await request(app.getHttpServer())
      .get('/market-context/offers')
      .set('X-Market-Id', KNOWN_MARKET)
      .expect(200);

    expect(response.body).toEqual({ marketId: KNOWN_MARKET });
  });

  it('leaves a market-free route without a market requirement', async () => {
    await request(app.getHttpServer())
      .get('/market-context/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('proves market selection does not bypass authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/market-context/protected-offers')
      .set('X-Market-Id', KNOWN_MARKET)
      .expect(401);

    expect(bodyOf(response).error.code).toBe(ApiErrorCode.UNAUTHORIZED);
  });

  it('proves authentication does not bypass market scoping', async () => {
    const response = await request(app.getHttpServer())
      .get('/market-context/protected-offers')
      .set('Authorization', 'Bearer valid-token')
      .expect(400);

    expect(bodyOf(response).error.code).toBe(ApiErrorCode.MARKET_ID_REQUIRED);
  });

  it('succeeds when both authentication and market scope are valid', async () => {
    const response = await request(app.getHttpServer())
      .get('/market-context/protected-offers')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Market-Id', KNOWN_MARKET)
      .expect(200);

    expect(response.body).toEqual({ marketId: KNOWN_MARKET });
  });
});
