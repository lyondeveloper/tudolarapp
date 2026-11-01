/**
 * The market — pure domain, no infrastructure imports.
 *
 * A market is a geographic service scope, not a city-name string (`AGENTS.md`,
 * "Product context"): each offer belongs to one market and searches require a
 * selected market. This module owns the market, its polygon, and the market
 * predicate (design.md, module table).
 *
 * The polygon itself is a PostGIS `Unsupported("geometry(Polygon, 4326)")`
 * column and is introduced with the first spatial table (T04); the market
 * predicate that reads it lives in `market-predicate.ts` and is the only place
 * proximity is combined with market scope.
 */

/** GeoJSON Polygon geometry representing the market's WGS84 boundary. */
export interface MarketBoundary {
  readonly type: 'Polygon';
  readonly coordinates: readonly (readonly [number, number])[][];
}

/** A market domain entity with geographic boundary and status. */
export interface Market {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly boundary: MarketBoundary;
  readonly isActive: boolean;
  readonly attribution?: string | null;
}

export class InvalidMarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMarketError';
  }
}

export interface CreateMarketInput {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly boundary: MarketBoundary;
  readonly isActive?: boolean;
  readonly attribution?: string | null;
}

function validateCoordinates(
  coordinates: readonly (readonly [number, number])[][],
): void {
  if (!coordinates || coordinates.length === 0) {
    throw new InvalidMarketError(
      'Market boundary must contain at least one linear ring.',
    );
  }

  const exteriorRing = coordinates[0];
  if (!exteriorRing || exteriorRing.length < 4) {
    throw new InvalidMarketError(
      'A polygon linear ring must contain at least 4 positions (including the closing point).',
    );
  }

  const first = exteriorRing[0];
  const last = exteriorRing[exteriorRing.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new InvalidMarketError(
      'The first and last positions of a linear ring must be identical.',
    );
  }

  for (const ring of coordinates) {
    for (const [lng, lat] of ring) {
      if (
        typeof lng !== 'number' ||
        typeof lat !== 'number' ||
        isNaN(lng) ||
        isNaN(lat)
      ) {
        throw new InvalidMarketError('Coordinates must be valid numbers.');
      }
      if (lng < -180 || lng > 180) {
        throw new InvalidMarketError(
          `Longitude ${lng} is outside the valid range [-180, 180].`,
        );
      }
      if (lat < -90 || lat > 90) {
        throw new InvalidMarketError(
          `Latitude ${lat} is outside the valid range [-90, 90].`,
        );
      }
    }
  }
}

export function createMarket(input: CreateMarketInput): Market {
  const trimmedId = input.id ? input.id.trim() : '';
  if (!trimmedId) {
    throw new InvalidMarketError('Market id cannot be empty.');
  }

  const trimmedName = input.name ? input.name.trim() : '';
  if (!trimmedName) {
    throw new InvalidMarketError('Market name cannot be empty.');
  }

  if (!input.boundary || input.boundary.type !== 'Polygon') {
    throw new InvalidMarketError(
      'Market boundary must be a valid GeoJSON Polygon.',
    );
  }

  validateCoordinates(input.boundary.coordinates);

  return Object.freeze({
    id: trimmedId,
    name: trimmedName,
    description: input.description?.trim() ?? null,
    boundary: input.boundary,
    isActive: input.isActive ?? true,
    attribution: input.attribution?.trim() ?? null,
  });
}
