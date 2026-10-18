/**
 * The market — pure domain, no infrastructure imports.
 *
 * A market is a geographic service scope, not a city-name string (`AGENTS.md`,
 * "Product context"): each offer belongs to one market and searches require a
 * selected market. This module owns the market, its polygon, and the market
 * predicate (design.md, module table).
 *
 * The polygon itself is a PostGIS `Unsupported("geometry")` column and is
 * introduced with the first spatial table (T04); the market predicate that reads
 * it lives in `market-predicate.ts` and is the only place proximity is combined
 * with market scope.
 */

/** A market as the API exposes it: an id and its human-readable name. */
export interface Market {
  readonly id: string;
  readonly name: string;
}
