import type { Asset, PairId } from '../../catalog/catalog';

/**
 * The search criteria — pure domain, no infrastructure imports.
 *
 * ADR-0003 makes the schema **closed**: every key is allowlisted and every enum
 * member comes from the shared `catalog`, so this module imports `Asset` and
 * `PairId` rather than declaring its own asset, rail, pair, or money type
 * (ADR-0025). The schema carries an explicit unparsed/needs-clarification
 * outcome, which ADR-0003 requires but does not name; the member below is that
 * outcome.
 */

/** Why the criteria exist: a search, an unsupported ask, or an unparsed one. */
export type SearchIntent = 'search_offer' | 'unsupported' | 'unparsed';

/** An amount filter: an exact decimal value plus the shared catalog asset. */
export interface SearchAmount {
  readonly value: string;
  readonly asset: Asset;
}

/** An optional location hint and radius, in kilometers (ADR-0017). */
export interface SearchLocation {
  readonly hintText: string | null;
  readonly radiusKm: number | null;
}

/** Per-field parser confidence, all zero when nothing was parsed. */
export interface SearchConfidence {
  readonly direction: number;
  readonly amount: number;
  readonly location: number;
}

/** The closed search criteria the manual filters and the parser both produce. */
export interface SearchCriteria {
  readonly intent: SearchIntent;
  readonly pairId: PairId | null;
  readonly amount: SearchAmount | null;
  readonly location: SearchLocation | null;
  readonly unresolved: readonly string[];
  readonly confidence: SearchConfidence;
}
