# 0006 — Publish authorization composition

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

T09 requires the publish gate to check **both** an eligible seller and an active entitlement — "an
offer cannot be published without an eligible seller and active entitlement" (`/tmp/backlog2.md:180`,
quoted in `docs/spikes/CROSS-C-commercial-trust.md:128-138`). Two reports independently propose the
two gates but do not agree how they compose:

- SP07 proposes a persisted `SellerEligibility` state — `none → contact_verified → eligible →
  suspended/rejected` — separate from `AccountStatus`, enforced in the offer use case via a port
  (`docs/spikes/SP07-seller-eligibility-trust-safety.md:47`, `SP07:61-64`).
- SP08 proposes entitlement as "a server-side pure function of stored state plus the server clock,
  evaluated at every gated operation" over subscription states `{pending, active, past_due,
  canceled_at_period_end, expired}`
  (`docs/spikes/SP08-subscription-compliance-launch.md:105-106`).

There is also a three-way name collision on "suspended": auth's `AccountStatus.suspended`
(`SP07:47`), SP07's `SellerEligibility.suspended/rejected` (`SP07:47`), and SP08's subscription
`expired` (`SP08:105`). `docs/spikes/CROSS-C-commercial-trust.md:128-138` records the missing
composition as mismatch IM2, and `docs/spikes/CROSS-C-commercial-trust.md:167-172` records the
missing owner as gap G1. This record corrects no single report claim; it fills that unowned gap.

## Decision

The publish gate is composed in the **offer-publish use case**, from **two ports**. Publishing
requires `seller eligibility AND subscription entitlement`, and the composition belongs in the use
case — not in the controller, and not inside either module
(`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:72-74`).

The vocabulary collision is resolved by keeping three distinct concepts with three distinct names:
`AccountStatus` (can this account sign in), `SellerEligibility` (may this seller publish), and
entitlement (is the subscription active). "Suspended" must not be reused across them
(`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:77-79`).

## Consequences

- The composition point is the offer-publish use case, which depends on two ports (eligibility and
  entitlement); neither module knows about the other.
- This is consistent with AGENTS.md: "Controllers must not contain business rules" (`AGENTS.md:68`)
  and "Keep business invariants in the domain or appropriate use case" (`AGENTS.md:72`), as the
  design cites (`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:75-76`).
- Left open (product owner): whether eligibility and subscription billing are global or
  market-specific (S3, `docs/spikes/CROSS-C-commercial-trust.md:238`; gap G4,
  `docs/spikes/CROSS-C-commercial-trust.md:188-193`), and which subscription states grant publishing
  (`docs/spikes/SP08-subscription-compliance-launch.md:105`).

## Alternatives considered

**Composing the gate in the controller.** Rejected: AGENTS.md requires business invariants in the
domain or the use case and forbids controllers holding business rules (`AGENTS.md:68`,
`AGENTS.md:72`; `openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:75-76`).

**Composing the gate inside either module (eligibility in SP07, or entitlement in SP08).**
Rejected: both inputs are ports and neither module knows about the other, so the composition cannot
live inside either (`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:75-76`).
