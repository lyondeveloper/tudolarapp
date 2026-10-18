/**
 * The entitlement port — the **only** subscription surface in the MVP (ADR-0014).
 *
 * ADR-0014 defers the entire subscription build (provider, plans, webhooks,
 * expiry), leaving the entitlement port in place so ADR-0006's publish gate is
 * composed from two real ports rather than a stubbed boolean. The offers use case
 * composes this port with seller eligibility in the publish gate; `sellers` and
 * `subscriptions` never need to know each other exists (ADR-0006).
 *
 * Entitlement is a server-side, fail-closed decision (SP08): the port resolves
 * it from stored state and the server clock, and never trusts the client.
 */

/** Where an entitlement decision came from. */
export type EntitlementSource = 'temporary' | 'test' | 'subscription';

/** One seller's entitlement decision. */
export interface Entitlement {
  readonly sellerId: string;
  readonly entitled: boolean;
  readonly source: EntitlementSource;
}

export const ENTITLEMENT_PORT = Symbol('ENTITLEMENT_PORT');

export interface EntitlementPort {
  /** Resolves whether `sellerId` is entitled to publish, failing closed. */
  resolveEntitlement(sellerId: string): Promise<Entitlement>;
}
