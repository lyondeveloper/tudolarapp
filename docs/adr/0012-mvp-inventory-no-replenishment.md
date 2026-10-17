# 0012 — MVP inventory has no replenishment

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group D register row — whether replenishment is allowed at all, and if so under
  which model (`docs/spikes/SYNTHESIS.md:89`, SP03)

## Context

SP03 proposed an immutable `initial_amount` with guarded stored counters and hide-at-zero,
restore-on-mutual-cancel (`docs/spikes/SYNTHESIS.md:13`), and `docs/spikes/SYNTHESIS.md:89` carried
"Replenishment: allowed at all, and if so under which model" as an open product-scope decision. The
product owner has adopted stored counters with the one-writer-same-transaction discipline
(`docs/spikes/SYNTHESIS.md:145,154-171`).

The product owner answered the replenishment question on 2026-10-17
(`openspec/changes/t01-product-decisions/design.md:30-32`).

## Decision

There is **no replenishment** in the MVP. A seller wanting more publishes a new offer
(`openspec/changes/t01-product-decisions/design.md:75-78`).

SP03's append-only ledger stays the documented option if this is revisited.

## Consequences

- `initial_amount` stays immutable for the life of the offer; the only writers of the stored counters
  remain the agreement transaction (`docs/spikes/SYNTHESIS.md:145,158-161`).
- No replenishment path means no new way to raise an offer's available amount after publication; more
  supply is a new offer, not an edit.
- SP03's append-only ledger is recorded as the option to adopt if replenishment is later allowed
  (`openspec/changes/t01-product-decisions/design.md:77-78`).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Allowing replenishment under SP03's append-only ledger.** Deferred, not adopted: the ledger stays
  the documented option if this is revisited (`openspec/changes/t01-product-decisions/design.md:77-78`).
- **Editing `initial_amount` in place to add supply.** Rejected: `initial_amount` is immutable and the
  guarded counters are its derived state (`docs/spikes/SYNTHESIS.md:145`).
