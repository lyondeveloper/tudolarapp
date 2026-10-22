# 0005 — Pair and rail representation

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** the flat single-value method enum in SP06/SP12 —
  `docs/spikes/SP06-prompt-to-search-contract.md:93-96` (`direction: { give: "ZELLE", receive:
  "USD_CASH" }`) and `docs/spikes/SP12-llm-natural-language-search.md:106`
  (`payment_method_offered`/`payment_method_wanted`), recorded as mismatch IM1 in
  `docs/spikes/CROSS-C-commercial-trust.md:107-126`.

## Context

The pair/rail enum has **four incompatible shapes** across SP01, SP02, SP06, and SP12:

| Producer | Shape it emits | Line |
| --- | --- | --- |
| SP01 | leg = `{asset, rail, delivery}`; pair = ordered `(give, receive)` from a closed allowlist | `docs/spikes/SP01-exchange-pairs.md:71-73` |
| SP02 | flat rate row keyed by display label, e.g. "VES → USD cash / Zelle" | `docs/spikes/SP02-pricing-quotes-limits.md:121-127` |
| SP06 | `direction: { give: "ZELLE", receive: "USD_CASH" }` — single value per side | `docs/spikes/SP06-prompt-to-search-contract.md:93-96` |
| SP12 | `payment_method_offered` / `payment_method_wanted` | `docs/spikes/SP12-llm-natural-language-search.md:106` |

— `docs/spikes/CROSS-C-commercial-trust.md:107-126`

SP01's own unresolved item U6 asks whether search criteria and offer contracts adopt the two-axis
model or keep one method enum (`docs/spikes/SP01-exchange-pairs.md:122`). Even after Zelle's
removal, the two VES rails (bank transfer vs physical cash) prove a single method enum cannot
express the catalog — that was SP01's finding, and Zelle's removal does not undo it
(`openspec/changes/spike-interface-reconciliation/design.md:65-67`).

## Decision

The pair/rail model is **two-axis internally, one closed enum externally**. A leg is
`{asset, rail, delivery}`; an offer is an ordered `(give, receive)` of legs. The API and the search
criteria expose a single **closed pair id** derived from those axes, because validation needs a flat
allowlist (`openspec/changes/spike-interface-reconciliation/design.md:61-64`).

Only the **shape** is decided here. The **members** of the enum are the product owner's; only the
shape is settled (`openspec/changes/spike-interface-reconciliation/design.md:70`).

## Consequences

- The API and search criteria expose the derived closed pair id; the pair's two axes remain internal.
  ADR-0003 adopts `pairId` so a criteria object cannot express an invalid catalog combination.
- The funnel event shape uses the closed `pairId`, not a two-leg `direction` or a singular
  `pair`/`currency` (mismatch I7, `docs/spikes/CROSS-B-discovery.md:170-174`).
- Left open (product owner, T01): the enum members and the canonical labels
  (`docs/spikes/CROSS-C-commercial-trust.md:267`, R4; `docs/spikes/SP01-exchange-pairs.md:123`, U7),
  and whether the flat pair id is an opaque id or a derived string (a T02 detail that does not change
  the two-axis model, `openspec/changes/spike-interface-reconciliation/design.md:109-110`).

## Alternatives considered

**One flat method enum, matching SP06 and SP12's current shape.** Rejected: it cannot distinguish
VES-by-bank from VES-in-cash, which are different pairs
(`openspec/changes/spike-interface-reconciliation/design.md:68-69`). Zelle's removal does not fix
this — the five surviving pairs still contain both VES rails
(`docs/spikes/CROSS-C-commercial-trust.md:122-126`).
