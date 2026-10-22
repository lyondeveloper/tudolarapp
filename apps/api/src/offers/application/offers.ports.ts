import type { PairId } from '../../catalog/catalog';
import type { Money } from '../../catalog/money';
import type { TransactionContext } from '../../common/application/transaction.ports';
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
export const INVENTORY_RESERVATION_PORT = Symbol('INVENTORY_RESERVATION_PORT');

export interface OfferRepositoryPort {
  findById(
    offerId: string,
    transaction?: TransactionContext,
  ): Promise<Offer | null>;
  create(offer: Offer, transaction: TransactionContext): Promise<void>;
  /** Moves the pointer atomically; never touches a version row. */
  pointAtCurrentVersion(
    offerId: string,
    termsVersionId: string,
    transaction: TransactionContext,
  ): Promise<void>;
}

export interface TermsVersionRepositoryPort {
  current(
    offerId: string,
    transaction?: TransactionContext,
  ): Promise<OfferTermsVersion | null>;
  /** Append-only: inserts a version and never updates an existing one (ADR-0001). */
  append(
    version: OfferTermsVersion,
    transaction: TransactionContext,
  ): Promise<void>;
}

/**
 * The inventory contract owned by offers and consumed by agreement transitions.
 * Calls that change counters participate in the same transaction as the
 * corresponding agreement state change (ADR-0026).
 */
export interface InventoryReservationPort {
  /** Amounts use the offer's give asset; false means the atomic guard did not win. */
  reserve(
    offerId: string,
    amount: Money,
    transaction: TransactionContext,
  ): Promise<boolean>;
  /** False reports a disallowed transition or underflow; callers must roll back. */
  release(
    offerId: string,
    amount: Money,
    transaction: TransactionContext,
  ): Promise<boolean>;
  /** False reports insufficient reserved inventory; callers must roll back. */
  complete(
    offerId: string,
    amount: Money,
    transaction: TransactionContext,
  ): Promise<boolean>;
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
  readonly marketId: string;
  readonly pairId: PairId;
  readonly description: string;
  readonly details: string | null;
  /** Total finite inventory, denominated in the pair's give asset. */
  readonly initialAmount: Money;
  readonly giveAmount: Money;
  readonly receiveAmount: Money;
  readonly rate: string | null;
  readonly marginPct: string;
  readonly minAmount: Money;
  readonly maxAmount: Money;
  /** The application resolves ADR-0010's seven-day default when omitted. */
  readonly expiresAt?: Date;
}
