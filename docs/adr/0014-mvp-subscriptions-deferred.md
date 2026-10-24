# 0014 — MVP subscriptions are deferred

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group F register rows — subscription plans and prices, the charging provider,
  expiry and grace policy, refunds, and whether app-store billing is mandatory
  (`docs/spikes/SYNTHESIS.md:106-107`, SP08)

## Context

SP08 proposed a provider-neutral subscription port with entitlement derived server-side and failing
closed, and webhook-only payment facts deduped, with zero per-exchange commission
(`docs/spikes/SYNTHESIS.md:18`). ADR-0006 composes the publish gate in the offer-publish use case from
two ports: publishing requires seller eligibility AND subscription entitlement
(`docs/adr/0006-publish-authorization-composition.md:27-37`). `docs/spikes/SYNTHESIS.md:106-107` carried
the subscription plans/prices, provider, expiry/grace, refunds, and app-store billing as open, and
`docs/spikes/SYNTHESIS.md:95-96` listed self-serve billing among the deferral candidates.

The product owner answered on 2026-10-17 (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

Subscriptions (F1–F5) are **deferred for the MVP**. Every seller is entitled through the documented
temporary mechanism the backlog explicitly permits, and no billing is built
(`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:92-97`).

This removes the entire subscription build — provider, plans, webhooks, expiry — from the MVP while
leaving the entitlement **port** in place so ADR-0006's publish gate is real rather than stubbed.

App-store billing applicability and privacy/retention obligations for billing records remain group G
legal-review inputs, not resolved legal conclusions or clearances.

## Consequences

- ADR-0006's publish gate stays composed from two ports; the entitlement port returns the temporary
  "entitled" result for every seller, so the composition is exercised rather than bypassed
  (`docs/adr/0006-publish-authorization-composition.md:27-37`).
- No billing is built: no provider integration, plans, webhooks, expiry, grace, refunds, or app-store
  billing in the MVP (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:94-97`).
- App-store billing applicability and billing-record privacy/retention remain for legal review; this
  deferral is not a legal clearance.
- The subscription decisions themselves are **deferred, not decided** — plans, prices, provider,
  expiry/grace, refunds, and app-store billing remain open for a later change
  (`docs/spikes/SYNTHESIS.md:106-107`).
- Revisit when subscriptions land: entitlement then becomes the second input of the same publish gate
  ADR-0006 defines, with no change to how eligibility is modelled
  (`docs/adr/0016-mvp-account-type.md`).
- Left open (unchanged): group **G** (the legal review, including app-store billing and privacy for
  billing) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Building the subscription stack in the MVP.** Rejected: deferring removes the whole build —
  provider, plans, webhooks, expiry — from the MVP (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:94-97`).
- **Stubbing the publish gate with a hardcoded boolean in the use case instead of keeping the port.**
  Rejected: ADR-0006 requires the gate to be composed from two ports, so the entitlement port must stay
  real for the gate to be real (`docs/adr/0006-publish-authorization-composition.md:27-37`).
- **Deciding plans, prices, and provider now while building nothing.** Rejected: those rows are
  deferred, not decided, and stay open for a later change (`docs/spikes/SYNTHESIS.md:106-107`).
