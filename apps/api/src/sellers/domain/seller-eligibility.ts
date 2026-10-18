/**
 * The seller eligibility state — pure domain, no infrastructure imports.
 *
 * ADR-0016: selling is a **state**, never an account type. This module owns
 * `SellerEligibility` (design.md, module table); the offers use case composes it
 * with entitlement in the publish gate (ADR-0006). It is deliberately separate
 * from auth's `AccountStatus` (may this account sign in) — "suspended" is not
 * reused across the two (ADR-0006).
 */

/** The seller-eligibility states. Only `eligible` may publish (ADR-0006). */
export type SellerEligibilityState =
  'none' | 'contact_verified' | 'eligible' | 'suspended' | 'rejected';

/** One seller's eligibility, a state that can change without changing identity. */
export interface SellerEligibility {
  readonly sellerId: string;
  readonly state: SellerEligibilityState;
}

/** Whether this seller may publish. The publish gate's eligibility input. */
export function mayPublish(eligibility: SellerEligibility): boolean {
  return eligibility.state === 'eligible';
}
