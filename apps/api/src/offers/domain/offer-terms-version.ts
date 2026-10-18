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
 * One immutable terms version. `rate` is null for a same-asset pair, which
 * carries a margin only (ADR-0010 B2).
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

/** The offer aggregate, reduced to its pointer at the current terms version. */
export interface Offer {
  readonly id: string;
  readonly currentTermsVersionId: string | null;
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
