import type { Entitlement } from '../../../application/subscriptions.ports';

/**
 * The HTTP shape of an entitlement decision. It exposes only whether the seller
 * is entitled — never a plan, price, or provider (ADR-0014 defers those).
 */
export interface EntitlementDto {
  sellerId: string;
  entitled: boolean;
}

/** Maps the entitlement decision to its transport shape. */
export function toEntitlementDto(entitlement: Entitlement): EntitlementDto {
  return { sellerId: entitlement.sellerId, entitled: entitlement.entitled };
}
