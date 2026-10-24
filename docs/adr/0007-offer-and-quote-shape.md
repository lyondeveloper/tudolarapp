# 0007 — Offer and quote shape

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

SP01 and SP02 disagree on who owns the base rate:

- SP01 states "each direction carries a seller-set rate (SP02)"
  (`docs/spikes/SP01-exchange-pairs.md:110`).
- SP02 keeps "One platform reference per pair (single source + timestamp)"
  (`docs/spikes/SP02-pricing-quotes-limits.md:88`) and derives the effective rate as
  `receive = give / (R_ref · (1 + M))` (`SP02:123`), where `M` is the seller margin.

`docs/spikes/CROSS-C-commercial-trust.md:66-76` records this as conflict C1 and judges SP02 correct
on the pricing mechanics — but notes the reference source itself is unresolved (`SP02:244`, U1), so
the product owner must confirm whether a platform reference exists at all. That is a **product**
call and stays open. This record corrects no report claim; it fixes the shape the unresolved
question would otherwise block.

## Decision

The offer/quote contract shape is stable **whichever way the platform-reference question goes**. The
offer stores an explicit rate; the quote stores its source and as-of time; the seller margin is its
own field (`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:81-85`).

This change settles the **shape** and leaves the platform-reference question to T01
(`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:81-85`).

## Consequences

- The shape holds whether the rate is seller-set (SP01) or a platform reference plus a margin
  (SP02): the offer's explicit rate, the quote's source and as-of time, and a separate margin field
  cover both.
- Left open (product owner, T01): whether a platform reference rate exists at all, and how the seller
  margin is expressed (`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:107-108`;
  P1/P2, `docs/spikes/CROSS-C-commercial-trust.md:251-252`).

## Alternatives considered

**Making the contract shape depend on the platform-reference question.** Rejected: the shape does
not depend on it — the offer stores an explicit rate, the quote stores its source and as-of time, and
the seller margin is its own field — so the product question need not block the contract
(`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:81-85`).
