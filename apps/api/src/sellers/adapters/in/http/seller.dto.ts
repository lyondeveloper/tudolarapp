import type {
  SellerEligibility,
  SellerEligibilityState,
} from '../../../domain/seller-eligibility';

/**
 * The HTTP shape of a seller's eligibility. It is a state, never an account
 * type (ADR-0016), and it exposes no private account fields.
 */
export interface SellerEligibilityDto {
  sellerId: string;
  state: SellerEligibilityState;
}

/** Maps the domain eligibility to its transport shape. */
export function toSellerEligibilityDto(
  eligibility: SellerEligibility,
): SellerEligibilityDto {
  return { sellerId: eligibility.sellerId, state: eligibility.state };
}
