import type {
  SellerEligibility,
  SellerEligibilityState,
} from '../domain/seller-eligibility';

export interface PublicSellerProfile {
  id: string;
  displayName: string;
  state: SellerEligibilityState;
  memberSince: Date;
}

/**
 * The port `sellers` owns. It is one of the two inputs the offers use case
 * composes into the publish gate (ADR-0006); the other is the entitlement port
 * owned by `subscriptions`.
 */
export const SELLER_ELIGIBILITY_PORT = Symbol('SELLER_ELIGIBILITY_PORT');

export interface SellerEligibilityPort {
  /** The seller's current eligibility. Returns 'none' if un-onboarded. */
  getEligibility(sellerId: string): Promise<SellerEligibility>;

  /** Sets or updates the seller's eligibility state. */
  saveEligibility(
    sellerId: string,
    state: SellerEligibilityState,
  ): Promise<SellerEligibility>;

  /** Resolves public seller profile information, completely omitting private PII. */
  getPublicProfile(sellerId: string): Promise<PublicSellerProfile | null>;
}
