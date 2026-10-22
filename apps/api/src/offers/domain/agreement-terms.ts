import type { OfferTermsVersion } from './offer-terms-version';

/**
 * The agreement's reference to an immutable terms version — pure domain.
 *
 * ADR-0001: an agreement references a `termsVersionId`, not a copy of the terms.
 * A denormalized snapshot is allowed as an optimization but is never the source.
 * Because the numbers live in the referenced version and version rows are
 * insert-only, a later offer edit (which appends a new version) cannot change the
 * numbers a confirmed agreement already bound to.
 *
 * This is the terms-reference shape the offers module owns. The agreement
 * aggregate itself belongs to the exchanges module (design.md, module table),
 * which stores this reference.
 */

/** What an agreement stores to bind to the terms it was confirmed against. */
export interface AgreementTermsReference {
  readonly agreementId: string;
  readonly offerId: string;
  readonly termsVersionId: string;
}

/** Thrown when an agreement references a version outside its offer's history. */
export class AgreementTermsNotFoundError extends Error {
  constructor(termsVersionId: string) {
    super(`Agreement references an unknown terms version: ${termsVersionId}`);
    this.name = 'AgreementTermsNotFoundError';
  }
}

/**
 * Resolves an agreement's terms from the version it references, so a later offer
 * edit cannot change them.
 */
export function resolveAgreementTerms(
  reference: AgreementTermsReference,
  versions: readonly OfferTermsVersion[],
): OfferTermsVersion {
  const version = versions.find(
    (candidate) =>
      candidate.id === reference.termsVersionId &&
      candidate.offerId === reference.offerId,
  );
  if (!version) {
    throw new AgreementTermsNotFoundError(reference.termsVersionId);
  }
  return version;
}
