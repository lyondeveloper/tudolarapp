import { Prisma } from '../../../generated/prisma/client';
import type { SqlFragment } from '../../domain/market-predicate';

/**
 * The parameterized PostGIS query helper — the only place a domain SQL fragment
 * becomes a Prisma query. It lives in `adapters/out/` because raw SQL never
 * reaches `domain/` or `application/` (ADR-0023; design.md, "Safe PostGIS
 * queries").
 *
 * The fragment's text is emitted only through `Prisma.raw`, and it is built by
 * the domain builder from frozen identifier allowlists; the values are bound as
 * parameters through `Prisma.sql`, so nothing untrusted is ever interpolated.
 */

/**
 * The sort options the spatial query may order by. Ordering is an identifier,
 * not a value, so it cannot be parameterized and comes from this closed
 * allowlist instead (ADR-0023).
 */
export const SPATIAL_SORT_OPTIONS = Object.freeze([
  'distance',
  'recent',
] as const);

export type SpatialSortOption = (typeof SPATIAL_SORT_OPTIONS)[number];

/** Thrown when a sort option is not one of the allowlisted ones. */
export class UnknownSortOptionError extends Error {
  constructor(sort: string) {
    super(`Unknown spatial sort option: ${sort}`);
    this.name = 'UnknownSortOptionError';
  }
}

/** Narrows an untrusted sort option to the allowlist, rejecting anything else. */
export function resolveSortOption(sort: string): SpatialSortOption {
  if ((SPATIAL_SORT_OPTIONS as readonly string[]).includes(sort)) {
    return sort as SpatialSortOption;
  }
  throw new UnknownSortOptionError(sort);
}

/** The `ORDER BY` clause for an allowlisted sort option, with a stable tie-break. */
export function buildOrderBy(sort: SpatialSortOption): string {
  switch (sort) {
    case 'distance':
      return 'distance_meters ASC, offers.id ASC';
    case 'recent':
      return 'offers.created_at DESC, offers.id ASC';
  }
}

// The text between placeholders is produced only by the domain builder from its
// identifier allowlist. This defense-in-depth check rejects the characters that
// would let a fragment escape its context: quotes, a statement separator, a
// backslash, or a `--` comment.
const UNSAFE_FRAGMENT_TEXT = /['";\\]|--/;
const PLACEHOLDER = /^\$(\d+)$/;

/**
 * Renders a domain fragment into a parameterized `Prisma.Sql`. Each `$n`
 * placeholder becomes a bound parameter; the surrounding text is emitted raw
 * after a safety check, so no value is ever interpolated.
 */
export function toPrismaSql(fragment: SqlFragment): Prisma.Sql {
  const pieces: Prisma.Sql[] = [];

  for (const token of fragment.sql.split(/(\$\d+)/g)) {
    if (token.length === 0) {
      continue;
    }

    const placeholder = PLACEHOLDER.exec(token);
    if (placeholder) {
      const index = Number(placeholder[1]) - 1;
      if (index < 0 || index >= fragment.params.length) {
        throw new Error(`Fragment placeholder ${token} has no bound parameter`);
      }
      pieces.push(Prisma.sql`${fragment.params[index]}`);
    } else {
      if (UNSAFE_FRAGMENT_TEXT.test(token)) {
        throw new Error('Fragment contains unsafe SQL text');
      }
      pieces.push(Prisma.raw(token));
    }
  }

  return Prisma.join(pieces, '');
}
