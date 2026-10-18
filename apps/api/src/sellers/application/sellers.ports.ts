import type { SellerEligibility } from '../domain/seller-eligibility';

/**
 * The port `sellers` owns. It is one of the two inputs the offers use case
 * composes into the publish gate (ADR-0006); the other is the entitlement port
 * owned by `subscriptions`.
 *
 * The concrete adapter (a Prisma repository over the eligibility table) lands
 * with T08; this change freezes the port only.
 */
export const SELLER_ELIGIBILITY_PORT = Symbol('SELLER_ELIGIBILITY_PORT');

export interface SellerEligibilityPort {
  /** The seller's current eligibility. */
  getEligibility(sellerId: string): Promise<SellerEligibility>;
}
