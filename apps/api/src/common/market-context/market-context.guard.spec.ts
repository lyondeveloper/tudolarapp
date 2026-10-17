import 'reflect-metadata';
import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../errors/all-exceptions.filter';
import { ApiErrorCode } from '../errors/api-error-code';
import { MarketScoped } from './market-scoped.decorator';
import { MARKET_CONTEXT_PORT } from './market-context.port';

const KNOWN_MARKET = 'ciudad-ojeda';

interface MarketScopedRequest {
  marketId?: string;
}

@Controller('market-context')
class MarketContextController {
  @Get('offers')
  @MarketScoped()
  listOffers(@Req() req: MarketScopedRequest): { marketId: string | null } {
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
});
