import { getPair, type PairId } from '../../catalog/catalog';
import { MINOR_UNIT_SCALE, type Money } from '../../catalog/money';

/**
 * The immutable terms-version contract — pure domain, no infrastructure imports.
 *
 * ADR-0001 makes `offer_terms_versions` the source of truth and scopes it to the
 * **offer**: the offer row points at its current version, a material edit
 * **inserts version N+1** and moves the pointer, and an agreement references the
 * version id it agreed to. No version row is ever updated, so an edit cannot
 * silently change terms both parties already confirmed.
 *
 * The insert-only rule is expressed here in application code as well:
 * `createInitialTermsVersion` creates version one, `applyMaterialEdit` produces
 * version N+1, and `appendVersion` extends the append-only history. There is
 * deliberately no update, replace, or overwrite operation. The database
 * enforces the same rule independently (a `--create-only` migration adds the
 * trigger).
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

interface OfferTermsInput {
  readonly pairId: PairId;
  readonly giveAmount: Money;
  readonly receiveAmount: Money;
  readonly rate: string | null;
  readonly marginPct: string;
  readonly minAmount: Money;
  readonly maxAmount: Money;
  readonly expiresAt?: Date;
}

/** The material fields a seller may change only by producing a new version. */
export interface MaterialTermsEdit extends OfferTermsInput {
  readonly expiresAt: Date;
}

/** Complete seller terms for constructing the immutable first version. */
export interface InitialTermsVersionInput extends OfferTermsInput {
  readonly id: string;
  readonly offerId: string;
  readonly now: Date;
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
const RATE_PRECISION = 24;
const MONEY_PRECISION = 24;
const MONEY_COLUMN_SCALE = 6;
const MONEY_INTEGER_DIGITS = MONEY_PRECISION - MONEY_COLUMN_SCALE;
const DEFAULT_OFFER_EXPIRY_DAYS = 7;
const MAX_OFFER_EXPIRY_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

function integerDigitsOf(value: string): number {
  const [integer] = value.replace(/^[+-]/, '').split('.');
  return (integer.replace(/^0+/, '') || '0').length;
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

function assertFitsNumeric(
  value: string,
  precision: number,
  scale: number,
  label: string,
): void {
  assertScaledDecimal(value, scale, label);
  if (integerDigitsOf(value) > precision - scale) {
    throw new OfferTermsError(
      `${label} ${value} exceeds NUMERIC(${precision}, ${scale})`,
    );
  }
}

function scaledInteger(value: string, scale: number): bigint {
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  const scaledFraction = fraction.padEnd(scale, '0').slice(0, scale);
  const units = BigInt(`${integer}${scaledFraction}`);
  return negative ? -units : units;
}

function assertMoneyFitsColumn(amount: Money, label: string): void {
  const maximumExclusive =
    10n ** BigInt(MONEY_INTEGER_DIGITS + MINOR_UNIT_SCALE[amount.asset]);
  const absoluteMinorUnits =
    amount.minorUnits < 0n ? -amount.minorUnits : amount.minorUnits;

  if (absoluteMinorUnits >= maximumExclusive) {
    throw new OfferTermsError(
      `${label} exceeds NUMERIC(${MONEY_PRECISION}, ${MONEY_COLUMN_SCALE})`,
    );
  }
}

function assertPositiveMoney(amount: Money, label: string): void {
  assertMoneyFitsColumn(amount, label);
  if (amount.minorUnits <= 0n) {
    throw new OfferTermsError(`${label} must be greater than zero`);
  }
}

function assertOfferExpiry(expiresAt: Date, now: Date): void {
  const expiryTime = expiresAt.getTime();
  const currentTime = now.getTime();
  const maximumTime =
    currentTime + MAX_OFFER_EXPIRY_DAYS * MILLISECONDS_PER_DAY;

  if (
    !Number.isFinite(expiryTime) ||
    !Number.isFinite(currentTime) ||
    expiryTime <= currentTime ||
    expiryTime > maximumTime
  ) {
    throw new OfferTermsError(
      `expiresAt must be in the future and no more than ${MAX_OFFER_EXPIRY_DAYS} days away`,
    );
  }
}

/** Resolves the publish-time default and validates the maximum expiry window. */
export function resolveOfferExpiry(
  expiresAt: Date | undefined,
  now: Date,
): Date {
  const resolved =
    expiresAt ??
    new Date(now.getTime() + DEFAULT_OFFER_EXPIRY_DAYS * MILLISECONDS_PER_DAY);
  assertOfferExpiry(resolved, now);
  return new Date(resolved.getTime());
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

function validateTerms(
  terms: OfferTermsInput,
  now: Date,
  immutablePairId?: PairId,
): { pair: ReturnType<typeof getPair>; expiresAt: Date } {
  const pair = getPair(terms.pairId);
  if (immutablePairId !== undefined && terms.pairId !== immutablePairId) {
    throw new OfferTermsError('an offer pair cannot change after publication');
  }
  if (
    terms.giveAmount.asset !== pair.give.asset ||
    terms.receiveAmount.asset !== pair.receive.asset ||
    terms.minAmount.asset !== pair.give.asset ||
    terms.maxAmount.asset !== pair.give.asset
  ) {
    throw new OfferTermsError(
      'terms amount assets must match the selected pair',
    );
  }

  assertPositiveMoney(terms.giveAmount, 'giveAmount');
  assertPositiveMoney(terms.receiveAmount, 'receiveAmount');
  assertPositiveMoney(terms.minAmount, 'minAmount');
  assertPositiveMoney(terms.maxAmount, 'maxAmount');
  if (terms.minAmount.minorUnits > terms.maxAmount.minorUnits) {
    throw new OfferTermsError('minAmount must not exceed maxAmount');
  }

  assertScaledDecimal(terms.marginPct, MARGIN_PCT_SCALE, 'marginPct');
  assertMarginPctBound(terms.marginPct);
  if (pair.give.asset === pair.receive.asset) {
    if (terms.rate !== null) {
      throw new OfferTermsError('same-asset pairs must not carry a rate');
    }
  } else {
    if (terms.rate === null) {
      throw new OfferTermsError('conversion pairs must carry a rate');
    }
    assertFitsNumeric(terms.rate, RATE_PRECISION, RATE_SCALE, 'rate');
    if (scaledInteger(terms.rate, RATE_SCALE) <= 0n) {
      throw new OfferTermsError(
        'conversion-pair rates must be greater than zero',
      );
    }
  }

  return { pair, expiresAt: resolveOfferExpiry(terms.expiresAt, now) };
}

/** Builds version one after validating and resolving the seller's terms. */
export function createInitialTermsVersion(
  input: InitialTermsVersionInput,
): OfferTermsVersion {
  const { expiresAt } = validateTerms(input, input.now);
  return Object.freeze({
    id: input.id,
    offerId: input.offerId,
    version: 1,
    pairId: input.pairId,
    giveAmount: input.giveAmount,
    receiveAmount: input.receiveAmount,
    rate: input.rate,
    marginPct: input.marginPct,
    minAmount: input.minAmount,
    maxAmount: input.maxAmount,
    expiresAt,
    createdAt: new Date(input.now.getTime()),
  });
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
  if (current.offerId !== offer.id) {
    throw new OfferTermsError('current terms version belongs to another offer');
  }
  if (offer.currentTermsVersionId !== current.id) {
    throw new OfferTermsError(
      'current terms version does not match offer pointer',
    );
  }
  const { pair, expiresAt } = validateTerms(edit, now, current.pairId);

  const inventoryAmounts = [
    ['initialAmount', offer.initialAmount],
    ['reservedAmount', offer.reservedAmount],
    ['completedAmount', offer.completedAmount],
  ] as const;
  for (const [label, amount] of inventoryAmounts) {
    assertMoneyFitsColumn(amount, label);
    if (amount.asset !== pair.give.asset) {
      throw new OfferTermsError(
        `${label} must use the offer pair's give asset`,
      );
    }
  }
  if (offer.initialAmount.minorUnits <= 0n) {
    throw new OfferTermsError('initialAmount must be greater than zero');
  }
  if (
    offer.reservedAmount.minorUnits < 0n ||
    offer.completedAmount.minorUnits < 0n ||
    offer.reservedAmount.minorUnits + offer.completedAmount.minorUnits >
      offer.initialAmount.minorUnits
  ) {
    throw new OfferTermsError(
      'offer inventory counters are outside their bounds',
    );
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
    expiresAt,
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
