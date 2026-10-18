import type { PairId } from '../../catalog/catalog';
import type { Money } from '../../catalog/money';

/**
 * The immutable terms-version contract — pure domain, no infrastructure imports.
 *
 * ADR-0001 makes `offer_terms_versions` the source of truth and scopes it to the
 * **offer**: the offer row points at its current version, a material edit
 * **inserts version N+1** and moves the pointer, and an agreement references the
 * version id it agreed to. No version row is ever updated, so an edit cannot
 * silently change terms both parties already confirmed.
 *
 * The insert-only rule is expressed here in application code as well: the only
 * operations are `applyMaterialEdit` (produce the next version) and
 * `appendVersion` (extend the append-only history). There is deliberately no
 * update, replace, or overwrite operation. The database enforces the same rule
 * independently (a `--create-only` migration adds the trigger).
 */

/**
 * One immutable terms version. `rate` is receive-asset units per one give-asset
 * unit, and is comparable only within the same pair (ADR-0008). It is null for
 * a same-asset pair, which carries a margin only (ADR-0010 B2).
 */
export interface OfferTermsVersion {
  readonly id: string;
  readonly offerId: string;
  readonly version: number;
  readonly pairId: PairId;
  readonly giveAmount: Money;
  readonly receiveAmount: Money;
  readonly rate: string | null;
  readonly marginPct: string;
  readonly minAmount: Money;
  readonly maxAmount: Money;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

/**
 * The offers-owned aggregate. Inventory amounts are denominated in the give
 * asset; availability is derived from the three stored counters.
 */
export interface Offer {
  readonly id: string;
  readonly marketId: string;
  readonly sellerId: string;
  readonly status: string;
  readonly description: string;
  readonly details: string | null;
  readonly currentTermsVersionId: string | null;
  readonly initialAmount: Money;
  readonly reservedAmount: Money;
  readonly completedAmount: Money;
}

/** The material fields a seller may change only by producing a new version. */
export interface MaterialTermsEdit {
  readonly pairId: PairId;
  readonly giveAmount: Money;
  readonly receiveAmount: Money;
  readonly rate: string | null;
  readonly marginPct: string;
  readonly minAmount: Money;
  readonly maxAmount: Money;
  readonly expiresAt: Date;
}

/** The identity and clock a new version needs; both are supplied by the caller. */
export interface NewVersion {
  readonly id: string;
  readonly now: Date;
}

export interface MaterialEditResult {
  readonly offer: Offer;
  readonly version: OfferTermsVersion;
}

/**
 * The decimal scale of each stored terms number, matching its column exactly.
 * `margin_pct` is `NUMERIC(5, 2)` and `rate` is `NUMERIC(24, 8)`, so a value
 * with more fractional digits than its scale would be rounded by Postgres on
 * the way in. The domain rejects over-precision instead of letting the column
 * round it — the same rule `Money.of` applies to monetary amounts.
 */
export const MARGIN_PCT_SCALE = 2;
export const RATE_SCALE = 8;

/** Thrown when a terms number is not an exact decimal for its column. */
export class OfferTermsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferTermsError';
  }
}

// A canonical decimal: an optional sign, digits, and an optional fractional part.
const DECIMAL = /^[+-]?\d+(?:\.\d+)?$/;

function fractionOf(value: string): string {
  return value.replace(/^[+-]/, '').split('.')[1] ?? '';
}

/**
 * Asserts that `value` is a decimal with no more fractional digits than the
 * column scale. Trailing zeros beyond the scale carry no information and are
 * accepted, mirroring `Money.of`.
 */
function assertScaledDecimal(
  value: string,
  scale: number,
  label: string,
): void {
  if (!DECIMAL.test(value)) {
    throw new OfferTermsError(`${label} must be a decimal value: ${value}`);
  }
  const fraction = fractionOf(value);
  if (fraction.length > scale && /[^0]/.test(fraction.slice(scale))) {
    throw new OfferTermsError(
      `${label} ${value} has more than ${scale} decimal places; round it once ` +
        'before storing it instead of letting the database round it',
    );
  }
}

/**
 * Asserts the documented bound `0 <= margin < 100` (ADR-0010 B1). The
 * comparison runs in whole hundredths as a `bigint`, so no binary floating
 * point touches the bound.
 */
function assertMarginPctBound(value: string): void {
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  const scaled = fraction
    .padEnd(MARGIN_PCT_SCALE, '0')
    .slice(0, MARGIN_PCT_SCALE);
  const hundredths = BigInt(`${integer}${scaled}`);
  const bound = 100n * 10n ** BigInt(MARGIN_PCT_SCALE);

  if ((negative && hundredths !== 0n) || hundredths >= bound) {
    throw new OfferTermsError(
      `marginPct must satisfy 0 <= margin < 100: ${value}`,
    );
  }
}

/**
 * Applies a material edit by appending version N+1 and moving the offer's
 * pointer to it. The current version and the offer are returned unchanged
 * (fresh, frozen objects), so the caller persists the new row with an insert and
 * never updates an existing one.
 */
export function applyMaterialEdit(
  offer: Offer,
  current: OfferTermsVersion,
  edit: MaterialTermsEdit,
  { id, now }: NewVersion,
): MaterialEditResult {
  // Validate at the domain boundary: the database columns are `numeric`, so an
  // over-precise or out-of-range value would be rounded or rejected there
  // instead of here, and `marginPct` could silently reach the bound it must not.
  assertScaledDecimal(edit.marginPct, MARGIN_PCT_SCALE, 'marginPct');
  assertMarginPctBound(edit.marginPct);
  if (edit.rate !== null) {
    assertScaledDecimal(edit.rate, RATE_SCALE, 'rate');
  }

  const version: OfferTermsVersion = Object.freeze({
    id,
    offerId: offer.id,
    version: current.version + 1,
    pairId: edit.pairId,
    giveAmount: edit.giveAmount,
    receiveAmount: edit.receiveAmount,
    rate: edit.rate,
    marginPct: edit.marginPct,
    minAmount: edit.minAmount,
    maxAmount: edit.maxAmount,
    expiresAt: edit.expiresAt,
    createdAt: now,
  });

  const updated: Offer = Object.freeze({
    ...offer,
    currentTermsVersionId: version.id,
  });

  return { offer: updated, version };
}

/**
 * Extends the append-only history with a new version. The existing entries are
 * kept by reference; nothing is replaced.
 */
export function appendVersion(
  versions: readonly OfferTermsVersion[],
  version: OfferTermsVersion,
): readonly OfferTermsVersion[] {
  return Object.freeze([...versions, version]);
}
