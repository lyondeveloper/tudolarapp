import type { CursorPage } from '../../../../common/pagination/cursor-pagination';
import type { Market } from '../../../domain/market';

/**
 * The HTTP shape of a market. It imports the shared pagination contract for the
 * collection response rather than redeclaring a page shape of its own.
 */
export interface MarketDto {
  id: string;
  name: string;
}

/** The paginated market collection, using the one shared cursor-page shape. */
export type MarketListDto = CursorPage<MarketDto>;

/** Maps the domain market to its transport shape. */
export function toMarketDto(market: Market): MarketDto {
  return { id: market.id, name: market.name };
}
