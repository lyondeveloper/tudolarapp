import type {
  SellerEligibility,
  SellerEligibilityState,
} from '../../../domain/seller-eligibility';
import type { PublicSellerProfile } from '../../../application/sellers.ports';

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

/** The public-facing seller profile DTO without private PII. */
export interface PublicSellerProfileDto {
  id: string;
  displayName: string;
  state: SellerEligibilityState;
  memberSince: string;
}

/** Maps the public profile domain representation to DTO. */
export function toPublicSellerProfileDto(
  profile: PublicSellerProfile,
): PublicSellerProfileDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    state: profile.state,
    memberSince: profile.memberSince.toISOString(),
  };
}
