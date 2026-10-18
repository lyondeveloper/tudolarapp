import type { MarketContextPort } from '../../common/market-context/market-context.port';
import type { Market } from '../domain/market';

/**
 * The port `markets` owns. It is the read side of the market module and it also
 * satisfies `common`'s `MarketContextPort`, so the market-context guard is
 * answered by this module rather than by a second lookup.
 *
 * The concrete adapter (a Prisma repository over the market table and its
 * polygon) lands with T04; this change freezes the port only.
 */
export const MARKET_REPOSITORY = Symbol('MARKET_REPOSITORY');

export interface MarketRepositoryPort extends MarketContextPort {
  /** The market with `marketId`, or `null` when it does not exist. */
  findById(marketId: string): Promise<Market | null>;
}
