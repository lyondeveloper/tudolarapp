# 0010 — MVP pricing and offer terms

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group B register rows ADR-0008 explicitly left to the product owner — margin expression and bounds, same-asset pairs, quote validity, rounding, min/max, and offer expiry (SP02 U5–U8)

## Context

ADR-0008 decided that the seller sets every commercial value and that the platform publishes no
reference rate, deriving none. That resolved SP02's reference-source and reference-time questions as
not applicable, but it left SP02's remaining questions to the product owner: quote validity, rounding
scale, min/max bounds, and expiry (`docs/adr/0008-seller-sets-commercial-values.md:29-31`;
`docs/spikes/SYNTHESIS.md:104-105`). ADR-0008 also warned that offer expiry is now the only mitigation
for a stale rate (`docs/adr/0008-seller-sets-commercial-values.md:61-63`).

The product owner answered on 2026-10-17 (`openspec/changes/t01-product-decisions/design.md:30-32`).

## Decision

The offer's commercial terms are the seller's and are bounded only where a value would be meaningless
(`openspec/changes/t01-product-decisions/design.md:54-65`).

- **B1 — Margin is a percentage the seller sets, bounded to `0 ≤ margin < 100`.**
- **B2 — Same-asset pairs (`VES_BANK_TO_VES_CASH`) carry no rate.** There is no conversion; they carry
  a margin only, which is the seller's compensation for the form conversion.
- **B3 — Quote validity is 15 minutes**, and the confirmation binds to the quote it was shown.
- **B4 — Round once, server-side, to the receive asset's minor unit**: `VES` and `USD` to 2 decimals,
  `USDT` to 6.
- **B5 — The seller sets per-offer min and max in the pair's give asset.** Both must be positive and
  the minimum must not exceed the maximum. The platform sets only a floor of `> 0`; there is no
  platform maximum in the MVP.
- **B6 — Offer expiry defaults to 7 days, capped at 30.** A supplied expiry must be in the future
  and no more than 30 days after publication or a material edit. Expiry is load-bearing under
  ADR-0008, because it is the only mitigation for a stale rate.

## Consequences

- Rounding once, server-side, is consistent with `AGENTS.md:47` (money as `numeric`/minor unit, never
  binary floating point; define scale, rounding, and currency explicitly) and with SP02's
  single-rounding-step recommendation (`docs/spikes/SYNTHESIS.md:12`).
- The `> 0` floor with no platform maximum keeps the platform out of price-setting: it bounds only what
  would be meaningless, consistent with ADR-0008's "the platform applies no rate of its own"
  (`docs/adr/0008-seller-sets-commercial-values.md:20-22`).
- Expiry carries the weight ADR-0008 gave it: it is the **only** mitigation for a rate that drifts out
  of date (`docs/adr/0008-seller-sets-commercial-values.md:61-63`).
- Same-asset pairs carrying no rate is consistent with the pair catalog: `VES_BANK_TO_VES_CASH` is not a
  conversion (`docs/adr/0009-mvp-pair-and-rail-catalog.md`).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **A platform maximum on min/max.** Rejected: the platform sets only a `> 0` floor and no maximum in
  the MVP (`openspec/changes/t01-product-decisions/design.md:62-63`).
- **Expressing the margin as an absolute amount rather than a percentage.** Rejected: the margin is a
  percentage bounded to `0 ≤ margin < 100` (`openspec/changes/t01-product-decisions/design.md:56`).
- **Rounding in the client or the model, or rounding more than once.** Rejected: the backend owns
  money and rounds once, server-side, to the receive asset's minor unit
  (`openspec/changes/t01-product-decisions/design.md:60-61`; `AGENTS.md:47`).
- **A longer or uncapped offer expiry.** Rejected: expiry defaults to 7 days and is capped at 30
  (`openspec/changes/t01-product-decisions/design.md:64`).
