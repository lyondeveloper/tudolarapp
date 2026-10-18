/**
 * The market predicate builder — pure domain, no infrastructure imports.
 *
 * ADR-0023 and design.md ("Safe PostGIS queries") make geospatial safety a
 * query-construction rule: the market predicate and the proximity predicate
 * **always sit in the same `WHERE`**, so no query can return an out-of-market
 * offer. This module owns that rule for the offers table.
 * `buildOfferSpatialWhere` always emits the market predicate and appends the
 * proximity predicate only next to it, so there is no builder that can produce
 * proximity without market scope.
 *
 * Values are parameterized (`$1`, `$2`, ...). Only identifiers and the SRID,
 * which cannot be parameterized, are emitted from the frozen allowlists below.
 * Raw SQL execution lives in `adapters/out/`, never here.
 */

/** WGS84 — the single SRID every spatial column and predicate uses (ADR-0023). */
export const SRID_WGS84 = 4326;

/**
 * The identifiers the offer spatial predicate may reference. Identifiers cannot
 * be parameterized, so they come from this closed allowlist rather than from any
 * caller input (ADR-0023).
 */
export const OFFER_SPATIAL_IDENTIFIERS = Object.freeze({
  table: 'offers',
  marketId: 'market_id',
  location: 'location',
} as const);

/** The market a query is scoped to. A market id is required, never optional. */
export interface MarketScope {
  readonly marketId: string;
}

/** A proximity filter: a point and a radius in meters (geography units). */
export interface Proximity {
  readonly longitude: number;
  readonly latitude: number;
  readonly radiusMeters: number;
}

/** A parameterized SQL fragment: text with `$n` placeholders and its values. */
export interface SqlFragment {
  readonly sql: string;
  readonly params: readonly unknown[];
}

/** Thrown when a market scope or a proximity value is not usable. */
export class InvalidSpatialInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSpatialInputError';
  }
}

export interface OfferSpatialWhereInput {
  readonly scope: MarketScope;
  readonly proximity?: Proximity;
}

function assertScope(
  scope: MarketScope | undefined,
): asserts scope is MarketScope {
  if (
    scope === undefined ||
    typeof scope.marketId !== 'string' ||
    scope.marketId.trim().length === 0
  ) {
    throw new InvalidSpatialInputError(
      'A market scope with a non-empty marketId is required',
    );
  }
}

function assertProximity(proximity: Proximity): void {
  const { longitude, latitude, radiusMeters } = proximity;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new InvalidSpatialInputError(
      'proximity.longitude must be a finite number between -180 and 180',
    );
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new InvalidSpatialInputError(
      'proximity.latitude must be a finite number between -90 and 90',
    );
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new InvalidSpatialInputError(
      'proximity.radiusMeters must be a finite number greater than 0',
    );
  }
}

/**
 * Builds the `WHERE` fragment for a spatial offer query. The market predicate is
 * **always** present, and the proximity predicate can only ever appear in the
 * same fragment as it — so no query built here can return an out-of-market
 * offer.
 */
export function buildOfferSpatialWhere(
  input: OfferSpatialWhereInput,
): SqlFragment {
  assertScope(input.scope);
  const { table, marketId, location } = OFFER_SPATIAL_IDENTIFIERS;

  const conditions: string[] = [`${table}.${marketId} = $1`];
  const params: unknown[] = [input.scope.marketId];

  if (input.proximity !== undefined) {
    assertProximity(input.proximity);
    conditions.push(
      `ST_DWithin(${table}.${location}, ` +
        `ST_SetSRID(ST_MakePoint($2, $3), ${SRID_WGS84})::geography, $4)`,
    );
    params.push(
      input.proximity.longitude,
      input.proximity.latitude,
      input.proximity.radiusMeters,
    );
  }

  return Object.freeze({
    sql: conditions.join(' AND '),
    params: Object.freeze(params),
  });
}
