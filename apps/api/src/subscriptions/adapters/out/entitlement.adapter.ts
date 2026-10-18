import type {
  Entitlement,
  EntitlementPort,
} from '../../application/subscriptions.ports';

/**
 * The MVP entitlement adapter (ADR-0014). Every seller is entitled through the
 * documented temporary mechanism, so the publish gate is exercised rather than
 * bypassed. No billing is built: no provider, plans, webhooks, or expiry.
 */
export class TemporaryEntitlementAdapter implements EntitlementPort {
  resolveEntitlement(sellerId: string): Promise<Entitlement> {
    return Promise.resolve({ sellerId, entitled: true, source: 'temporary' });
  }
}

/**
 * The test-only entitlement adapter. It lets tests reach an active entitlement
 * without simulating a payment (SP08). It is selected only when
 * `ENTITLEMENT_MODE=test`, which `config/env.validation.ts` refuses outside
 * `NODE_ENV=test` — so selecting it in production fails startup rather than
 * serving. This mirrors the `EMAIL_DELIVERY_MODE`/`SMS_DELIVERY_MODE` guard.
 */
export class TestEntitlementAdapter implements EntitlementPort {
  resolveEntitlement(sellerId: string): Promise<Entitlement> {
    return Promise.resolve({ sellerId, entitled: true, source: 'test' });
  }
}
