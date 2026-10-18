# 0008 — The seller sets every commercial value; there is no platform reference rate

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the open question ADR-0007 deliberately left to the product owner

## Context

SP01 and SP02 disagreed about where a rate comes from. SP01 gives each direction a **seller-set rate**.
SP02 keeps a **platform reference rate** with only the seller's margin on top, and its open decisions
U1 and U2 asked for the reference-rate *source* and the *reference time*, with quote validity, refresh
cadence, and rounding built around that reference.

ADR-0007 settled the offer/quote *shape* while leaving the question itself open, because the shape
holds either way. The product owner has now decided it: **commercial values belong to the seller, not
to the system.**

## Decision

The seller sets every commercial value on an offer — the rate, the margin, the amount, and any limits
or expiry the offer carries. The platform publishes **no reference rate**, derives **no** rate, and
applies **no** rate of its own.

Consequences for the models the spikes proposed:

- **The quote is the seller's stated terms, frozen**, with a validity window. It carries the seller's
  rate and margin and the moment they were stated — but there is **no reference source and no
  reference as-of time**, because there is no reference.
- **SP02's open decisions U1 and U2 are resolved as not applicable** (reference source, reference
  time). Its U5–U8 (quote validity, rounding scale, min/max bounds, expiry) still stand, and remain
  the product owner's.
- **The seller margin stays a first-class field**, distinct from the platform's zero per-exchange
  commission, because it is now the *only* commercial lever the platform models. It remains a
  seller-declared value and is not used to calculate or adjust the rate.
- **The rate is a structured, normalized field the seller sets**, not free text, and search **filters
  and orders by it**. It is the number of receive-asset units per one give-asset unit
  (`receive / give`), stored as an exact decimal with at most eight fractional digits. Filters and
  ordering compare rates only within the same `PairId`; rates for different pairs have different
  units and are not cross-comparable. The same-asset `VES_BANK_TO_VES_CASH` pair has no rate, per
  ADR-0010 B2.
- **Nothing in the system computes a rate.** The backend validates that a submitted rate is
  well-formed and within any bounds the product owner sets; it never computes or corrects one. This is
  consistent with the existing rule that the LLM and the client may never own monetary calculation.

## Consequences

**What this buys.** The platform is a board, not a price-setter. It avoids integrating and operating a
rate feed, removes the ambiguity about who owns a number the platform never trades at, and keeps the
platform out of the position of publishing a currency rate it cannot honour — which matters for a
product that explicitly does not custody, settle, or escrow.

**What it costs, and the product owner should own these deliberately:**

- **A rate is filterable and sortable, but never judged.** Because the rate is a structured field the
  seller sets, search **may filter and order by it as a number**. What the platform cannot do without
  a reference is say whether a rate is *good*: no "fair rate" badge, no "best offer" claim, and no
  implied comparison against a market price. Ordering by the seller's stated rate is honest; calling
  the top result the best is not.
- **Filtering is what forces the rate to be normalized.** Two offers with the same `PairId` are
  comparable as numbers because the rate has the same receive-per-give unit. Rates from different
  pairs must not be ranged or ordered together, because their units differ.
- **The margin is not a rate input.** It is a separate seller-declared percentage, not a platform
  reference margin and not a formula for deriving or adjusting the rate. The system does not assert
  that the seller-entered margin and rate are mathematically consistent.
- **Rate staleness becomes the seller's risk, silently.** An offer published at one rate and left
  open drifts out of date with no system-level signal. The offer's expiry is now the only mitigation,
  which raises the weight of the expiry decision (SP02 U7).
- **Buyers get no anchor.** A buyer with no external reference has to judge the rate themselves. That
  is normal for a classifieds board and honest, but it is a product choice with a real effect on
  buyer confidence, and worth revisiting if buyers report difficulty.

## Alternatives considered

- **A platform reference rate with a seller margin on top (SP02's model).** Rejected by the product
  owner: it makes the system a price-setter, requires a rate feed the platform would have to operate
  and defend, and implies an endorsement the product's no-custody stance does not support.
- **A reference shown as advisory only, with the seller free to ignore it.** Rejected as a middle
  path that keeps the feed's cost and the implied endorsement while giving up the comparability that
  was its only benefit.
- **No rate field at all, free-text terms in the description.** Rejected: the seller's margin is a
  fixed MVP requirement and must be persisted and displayed as structured data, so the rate and margin
  stay typed fields even though their values are the seller's.
