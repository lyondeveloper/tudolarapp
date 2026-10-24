# 0018 — MVP defers earnings

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** group J's J1 — whether the seller's own margin is shown as earnings, and under what
  label (`docs/spikes/SYNTHESIS.md:97-98`)

## Context

SP11 proposed a seller-only paginated history from the immutable terms snapshot, with a per-asset daily
summary of **completed** exchanges bucketed on the market-local civil day and exact decimals
(`docs/spikes/SYNTHESIS.md:21`). It also refused a "verified earnings" label, on the same no-custody
basis the set restates: nothing may imply custody, escrow, or settlement
(`docs/spikes/SYNTHESIS.md:40-41`). `docs/spikes/SYNTHESIS.md:97-98` carried "whether the seller's own
margin is shown as earnings and under what label" as an open product decision.

The product owner answered on 2026-10-17 (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

**J1 — The seller's margin is not displayed as "earnings" in the MVP.** The earnings screen is deferred
with SP11's work. Nothing on any screen may read as profit or verified earnings
(`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:119-120`).

## Consequences

- The margin remains a commercial value the seller sets (ADR-0008), but it is not surfaced as income in
  the MVP (`docs/adr/0008-seller-sets-commercial-values.md:32-33`).
- The earnings screen ships with SP11's work, not the MVP
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:119-120`).
- No screen may read as profit or verified earnings, consistent with SP11's refusal of a "verified
  earnings" label and the set's no-custody stance
  (`docs/spikes/SYNTHESIS.md:40-41`).
- The already-taken decision that daily earnings bucket on market-local time (`America/Caracas`,
  server-side) stands as the SP11 contract, but it is not implemented in the MVP
  (`docs/spikes/SYNTHESIS.md:147`).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Showing the seller's margin as "earnings" in the MVP.** Rejected: the margin is not displayed as
  earnings, and nothing on any screen may read as profit or verified earnings
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:119-120`).
- **A "verified earnings" label.** Rejected by SP11 on the no-custody basis: the platform does not
  custody, settle, or escrow, so it cannot verify earnings
  (`docs/spikes/SYNTHESIS.md:40-41`).
