import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';
import { MARKET_CONTEXT_PORT } from './market-context.port';
import type { MarketContextPort } from './market-context.port';

export const MARKET_ID_HEADER = 'x-market-id';

/**
 * Enforces the `X-Market-Id` contract on a market-scoped route: the header is
 * required, the server validates it on every operation, and a missing or
 * unknown market is a coded `400` — never a silent default to "all markets".
 *
 * Market selection is not authorization, so the guard runs before the use case
 * and only establishes which market the request is scoped to. It is opt-in per
 * route via `@MarketScoped()`; it is not registered globally, so health and
 * auth stay market-free.
 */
@Injectable()
export class MarketContextGuard implements CanActivate {
  constructor(
    @Inject(MARKET_CONTEXT_PORT)
    private readonly markets: MarketContextPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { marketId?: string }>();

    const header = request.headers[MARKET_ID_HEADER];
    const value = Array.isArray(header) ? header[0] : header;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ApplicationError(ApiErrorCode.MARKET_ID_REQUIRED);
    }

    const marketId = value.trim();
    if (!(await this.markets.exists(marketId))) {
      throw new ApplicationError(ApiErrorCode.MARKET_NOT_FOUND);
    }

    request.marketId = marketId;
    return true;
  }
}
