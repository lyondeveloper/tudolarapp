import type { PairId } from '../../catalog/catalog';
import type { Money } from '../../catalog/money';
import type { SellerEligibilityPort } from '../../sellers/application/sellers.ports';
import type { EntitlementPort } from '../../subscriptions/application/subscriptions.ports';
import type { Offer, OfferTermsVersion } from '../domain/offer-terms-version';

/**
 * The ports the offers module owns and consumes. It imports the shared `catalog`
 * contracts (`PairId`, `Money`) rather than redeclaring a pair, asset, rail, or
 * money type (ADR-0025), and it declares the two ports it composes into the
 * publish gate (ADR-0006).
 *
 * The concrete adapters (Prisma repositories) land with T09; this change freezes
 * the ports only.
 */
export const OFFER_REPOSITORY = Symbol('OFFER_REPOSITORY');
export const TERMS_VERSION_REPOSITORY = Symbol('TERMS_VERSION_REPOSITORY');

export interface OfferRepositoryPort {
  findById(offerId: string): Promise<Offer | null>;
  /** Moves the offer's current-version pointer; never touches a version row. */
  pointAtCurrentVersion(offerId: string, termsVersionId: string): Promise<void>;
}

export interface TermsVersionRepositoryPort {
  current(offerId: string): Promise<OfferTermsVersion | null>;
  /** Append-only: inserts a version and never updates an existing one (ADR-0001). */
  append(version: OfferTermsVersion): Promise<void>;
}

/**
 * The two ports the offers use case composes into the publish gate (ADR-0006).
 * Neither `sellers` nor `subscriptions` knows the other exists; the composition
 * lives here, not in the controller and not inside either module.
 */
export interface PublishGatePorts {
  readonly eligibility: SellerEligibilityPort;
  readonly entitlement: EntitlementPort;
}

/** A seller's request to publish an offer. Amounts are exact `Money` values. */
export interface PublishOfferRequest {
  readonly sellerId: string;
  readonly pairId: PairId;
  readonly giveAmount: Money;
  readonly receiveAmount: Money;
}
