import type { MarketContextPort } from '../../common/market-context/market-context.port';
import type { Market } from '../domain/market';

/**
 * The port `markets` owns. It is the read side of the market module and it also
 * satisfies `common`'s `MarketContextPort`, so the market-context guard is
 * answered by this module rather than by a second lookup.
 *
 * The concrete adapter (`PrismaMarketRepository`) queries the `markets` table
 * and evaluates boundary containment (`ST_Covers`) via PostGIS.
 */
export const MARKET_REPOSITORY = Symbol('MARKET_REPOSITORY');

/** A geographic coordinate point in WGS84. */
export interface MarketPoint {
  readonly longitude: number;
  readonly latitude: number;
}

export interface MarketRepositoryPort extends MarketContextPort {
  /** The market with `marketId`, or `null` when it does not exist. */
  findById(marketId: string): Promise<Market | null>;

  /** All active markets currently available for service. */
  findAllActive(): Promise<Market[]>;

  /**
   * Whether the given coordinate point is contained within the market boundary
   * using PostGIS boundary-inclusive containment (`ST_Covers`).
   */
  containsPoint(marketId: string, point: MarketPoint): Promise<boolean>;
}
