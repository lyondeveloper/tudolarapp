import { Prisma } from '../../generated/prisma/client';

const SAFE_SQL_IDENTIFIER = /^[a-z][a-z0-9_]*$/;

export interface SpatialColumnRef {
  readonly table: string;
  readonly geographyColumn: string;
}

export interface SpatialAllowlist {
  has(table: string, geographyColumn: string): boolean;
}

export interface ProximityFilterInput {
  readonly table: string;
  readonly geographyColumn: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly radiusMeters: number;
  readonly maxRadiusMeters: number;
}

/**
 * Production allowlist starts empty because no spatial table exists yet;
 * T04 registers the first spatial table and column when introducing it.
 */
export const PRODUCTION_SPATIAL_ALLOWLIST = createSpatialAllowlist([]);

export function createSpatialAllowlist(
  entries: readonly SpatialColumnRef[],
): SpatialAllowlist {
  const keys = new Set<string>();
  for (const { table, geographyColumn } of entries) {
    if (
      !SAFE_SQL_IDENTIFIER.test(table) ||
      !SAFE_SQL_IDENTIFIER.test(geographyColumn)
    ) {
      throw new Error(
        `Invalid SQL identifier in spatial allowlist: ${table}.${geographyColumn}`,
      );
    }
    keys.add(`${table}.${geographyColumn}`);
  }
  return {
    has(table: string, geographyColumn: string): boolean {
      return (
        SAFE_SQL_IDENTIFIER.test(table) &&
        SAFE_SQL_IDENTIFIER.test(geographyColumn) &&
        keys.has(`${table}.${geographyColumn}`)
      );
    },
  };
}

export function kilometresToMeters(kilometres: number): number {
  if (!Number.isFinite(kilometres) || kilometres <= 0) {
    throw new Error('Radius in kilometres must be a finite positive number');
  }
  return kilometres * 1000;
}

export function proximityFilter(
  input: ProximityFilterInput,
  allowlist: SpatialAllowlist = PRODUCTION_SPATIAL_ALLOWLIST,
): Prisma.Sql {
  if (!allowlist.has(input.table, input.geographyColumn)) {
    throw new Error(
      `Spatial column "${input.table}.${input.geographyColumn}" is not allowlisted`,
    );
  }
  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new Error('Longitude must be a finite number between -180 and 180');
  }
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    throw new Error('Latitude must be a finite number between -90 and 90');
  }
  if (!Number.isFinite(input.maxRadiusMeters) || input.maxRadiusMeters <= 0) {
    throw new Error('maxRadiusMeters must be a finite positive number');
  }
  if (
    !Number.isFinite(input.radiusMeters) ||
    input.radiusMeters <= 0 ||
    input.radiusMeters > input.maxRadiusMeters
  ) {
    throw new Error(
      `radiusMeters must be a finite positive number <= ${input.maxRadiusMeters}`,
    );
  }

  const qualifiedColumn = Prisma.raw(
    `"${input.table}"."${input.geographyColumn}"::geography`,
  );

  return Prisma.sql`ST_DWithin(${qualifiedColumn}, ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography, ${input.radiusMeters})`;
}
