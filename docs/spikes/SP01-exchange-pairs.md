# SP01 — Normalize MVP Exchange Pairs and Payment Rails

## 1. Task and acceptance criteria

Quoted from the backlog snapshot `/tmp/backlog2.md`, section `### SP01 — Normalize MVP Exchange Pairs and Payment Rails` (lines 36–41):

> **Suggested owner:** Product + payments/backend. **Depends on:** T00.
> - Produce the definitive directional matrix of the ten approved pairs from the buyer's perspective (buyer gives → buyer receives).
> - Document the exact value/method given and received for each pair, distinguishing asset, payment rail, and physical/digital delivery. Validate the specified VES bank-account → physical VES cash flow and the operational meaning of Zelle/USDT combinations.
> - Do not add pair directions beyond the approved MVP catalog.
>
> **Acceptance criteria:** a product-owner-approved matrix covers all ten pairs with unambiguous labels, buyer/seller actions, rails, and fulfillment mode; remaining operational or legal questions are explicit.

The ten approved pairs are enumerated once, authoritatively, in T01 (`/tmp/backlog2.md` line 110):

> VES → USDT; VES in a bank account → physical VES cash; VES → USD cash; VES → Zelle; Zelle → USD cash; Zelle → VES; Zelle → USDT; USDT → VES; USDT → USD cash; USDT → Zelle. No additional pairs are allowed in this MVP.

This spike does not decide the product's direction set; it normalizes the given set and surfaces what remains open.

## 2. Evidence and sources

### Observed (read in this repository or in the backlog)

- The ten pairs, the buyer-perspective framing, and the VES bank-account description are fixed in the backlog: `/tmp/backlog2.md` line 38 ("from the buyer's perspective (buyer gives → buyer receives)"), line 110 (the catalog and "For bank-account VES → physical VES cash, the buyer transfers bolivars from their bank account and receives bolivars in cash from the seller"), line 110 ("Do not assume a 1:1 rate").
- The product is an **in-person** P2P marketplace of cash and currencies: `AGENTS.md` line 7; `README.md` lines 3, 7, 9.
- The app **does not custody, settle, or escrow**: `AGENTS.md` line 11; `README.md` line 9; `docs/architecture.md` line 53; `openspec/config.yaml` lines 8–10.
- An exchange record is coordination only, not settlement: `docs/architecture.md` line 49; `docs/flows/search-and-contact.md` line 53.
- Existing typed search criteria already model a pair as **two method fields**: `docs/flows/search-and-contact.md` lines 33–44, with `"payment_method_offered": "ZELLE"` and `"payment_method_wanted": "USD_CASH"` for "needing 50 bucks on Intercomunal via Zelle" (lines 36–44). This is the one existing, non-invented representation of a direction in the repo.
- The platform's per-exchange commission stays **zero**; the **seller** sets a mandatory margin/commission on the offer: `/tmp/backlog2.md` lines 110, 112; `docs/flows/seller-offer-lifecycle.md` line 30.
- Direction, units, amount limits, rate rules, expiry, and statuses are explicitly **still to be defined**: `/tmp/backlog2.md` line 110.
- No marketplace, offers, search, or exchange code exists yet: `README.md` line 55; `docs/architecture.md` line 57; `apps/api/README.md` line 17.

### Assumed (external domain facts, not verified inside this repository)

These underpin the rail semantics below but are **not** stated in the repo. They are recorded as assumptions and are inputs to SP08/legal confirmation, not conclusions of this spike.

- **Zelle moves USD between US bank accounts**; it is a transfer rail, not a currency or asset, and requires an enrolled US bank account. (External general knowledge; no repository source. To be confirmed by SP08.)
- **USDT is an on-chain crypto token** transferable to a wallet address, on more than one network. (External general knowledge; to be confirmed by SP08/SP09.)
- **Bank transfers and Zelle transfers are generally irreversible and carry no platform escrow.** This is consistent with the repo's explicit no-escrow stance (`AGENTS.md` line 11) but the irreversibility detail itself is external.

## 3. Options considered

The question this spike must answer is how to normalize the ten pairs so that a leg's **asset**, its **rail**, and its **physical/digital delivery** are distinguishable without adding pairs. Four representations were considered.

### Option A — Two-axis leg model: each leg = (asset, rail, delivery)

- **Pros:** separates the asset from the rail, so "Zelle" is correctly a USD rail rather than a third currency; distinguishes the two VES rails the catalog itself contains ("VES" vs "VES in a bank account"); extends to new rails without new pairs; makes physical vs digital delivery explicit.
- **Cons:** more fields than the existing single method enum, so the search criteria and offer contracts must be reconciled; needs enum/label decisions that are the product owner's.
- **Verdict:** **kept** — it is the only representation that resolves the ambiguities the task names (asset vs rail vs delivery) while leaving the catalog at ten.

### Option B — Single method enum, as in the current LLM contract

- **Pros:** already exists in `docs/flows/search-and-contact.md` (lines 36–44); fewest fields.
- **Cons:** conflates asset and rail ("Zelle" hides that it is USD); cannot represent both VES rails with one `VES` value, yet the catalog contains both (pair 2 vs the rest); pushes asset meaning into each method's name.
- **Verdict:** **kept only as the current, partial state** to reconcile — not as the target, because it cannot express pair 2 distinctly.

### Option C — Fixed allowlist of the ten (give, receive) tuples

- **Pros:** directly enforces "no additional pairs" (`/tmp/backlog2.md` line 40); simple validation.
- **Cons:** duplicates method semantics; brittle; cannot express the rail/asset distinction; still needs the leg semantics underneath to label a leg.
- **Verdict:** **rejected as the sole model** — useful as a validation constraint layered on top of Option A, not as the representation.

### Option D — Asset-only pairs (VES / USD / USDT)

- **Pros:** fewest pairs.
- **Cons:** cannot distinguish pair 2 (VES bank → VES cash) from a no-op, since both legs are VES; discards the delivery/rail distinction the spike is explicitly asked to produce.
- **Verdict:** **rejected.**

## 4. Recommendation

Normalize each leg of a pair as **(asset, rail, delivery)** and keep the pair as an ordered `(give, receive)` tuple drawn from the closed catalog of ten. The following matrix is the recommendation for the product owner's approval; it adds no directions.

Legend — **Assets:** `USD`, `VES`, `USDT`. **Rails:** `USD cash` and `VES cash` are physical forms; `VES bank transfer` and `Zelle` are digital bank rails; `USDT transfer` is a digital on-chain rail. **Delivery:** physical (in-person handover) or digital (remote transfer).

| # | Pair (buyer gives → buyer receives) | Buyer gives: asset / rail / delivery | Buyer receives: asset / rail / delivery | Fulfillment |
| --- | --- | --- | --- | --- |
| 1 | VES → USDT | VES / *unqualified VES rail (U1)* / TBD | USDT / USDT transfer (on-chain) / digital | hybrid or remote |
| 2 | VES in a bank account → physical VES cash | VES / VES bank transfer / digital | VES / VES cash / physical | hybrid |
| 3 | VES → USD cash | VES / *unqualified VES rail (U1)* / TBD | USD / USD cash / physical | hybrid or in-person |
| 4 | VES → Zelle | VES / *unqualified VES rail (U1)* / TBD | USD / Zelle / digital | hybrid |
| 5 | Zelle → USD cash | USD / Zelle / digital | USD / USD cash / physical | hybrid |
| 6 | Zelle → VES | USD / Zelle / digital | VES / *unqualified VES rail (U1)* / TBD | hybrid |
| 7 | Zelle → USDT | USD / Zelle / digital | USDT / USDT transfer (on-chain) / digital | remote |
| 8 | USDT → VES | USDT / USDT transfer (on-chain) / digital | VES / *unqualified VES rail (U1)* / TBD | hybrid |
| 9 | USDT → USD cash | USDT / USDT transfer (on-chain) / digital | USD / USD cash / physical | hybrid |
| 10 | USDT → Zelle | USDT / USDT transfer (on-chain) / digital | USD / Zelle / digital | remote |

The seller's side is the exact mirror: **seller gives = buyer receives**, **seller receives = buyer gives**.

### What the matrix makes explicit

- **Zelle is a rail, not an asset.** Every Zelle leg carries **USD**. Pairs 4, 5, 6, 7, 10 move USD through Zelle; pairs 5 and 10 deliver USD by Zelle, pairs 4, 6, 7 receive USD by Zelle. Zelle must never be labeled as a third currency alongside USD and USDT.
- **USDT is both the asset and (via its chain) the rail.** A USDT leg is a digital on-chain transfer to a wallet; the platform does not custody it (`AGENTS.md` line 11).
- **Pairs 2 and 5 are same-asset form conversions (cash-in/cash-out), not FX.** Pair 2 converts VES bank balance ↔ VES cash; pair 5 converts USD (Zelle) ↔ USD cash. There is no currency conversion, so the seller's compensation is the margin (`/tmp/backlog2.md` line 110), not a rate spread.
- **Fulfillment is mostly hybrid or fully remote**, which sits in tension with the product's in-person framing (`AGENTS.md` line 7). Pairs 7 and 10 are fully digital on both legs; pairs 2, 5, 9 give remotely and receive in person. Whether an in-person meeting is still required for the fully-digital pairs is a product decision (U2).

### Validating the VES bank-account → physical VES cash flow (pair 2)

The direction in the backlog (`/tmp/backlog2.md` line 110) is internally consistent and is confirmed by the matrix:

- **Buyer gives:** VES by **bank transfer** from the buyer's bank account — digital, remote, and (per the assumption in §2) effectively irreversible.
- **Buyer receives:** VES in **physical cash** from the seller — physical, in person.
- **Seller gives** VES cash; **seller receives** VES into a bank account.
- **Both legs are VES**, so this is a form conversion, not a currency exchange; the seller's compensation is the margin.
- **Fulfillment is hybrid:** a remote give leg plus an in-person receive leg. The pair is coherent; what it leaves open is the operational envelope (U1 for the counterpart rail's naming, and U5 for ordering/trust), not its direction.

### Operational meaning of the Zelle and USDT combinations

- **Zelle combinations:** each Zelle leg is a **USD** transfer over a US bank rail (assumption, §2). Operationally that means at least one party must hold a US bank account enrolled in Zelle, and the transfer is remote and generally irreversible. Because the platform does not escrow, the ordering and counterparty-trust problem is real (U5). Whether Zelle's own terms permit this marketplace use is legal, not technical (U3).
- **USDT combinations:** each USDT leg is a **digital on-chain** transfer of the USDT token to a wallet. Operationally the offer must pin the network/chain, the wallet address, the confirmation and fee expectations, and the fact that the platform never holds the token (U4). USDT is not guaranteed 1:1 with USD — the backlog forbids assuming a 1:1 rate (`/tmp/backlog2.md` line 110) — so each direction carries a seller-set rate (SP02).
- **Zelle ↔ USDT (pairs 7 and 10)** are fully digital cross-asset pairs: USD via Zelle on one leg, USDT on-chain on the other. No in-person handover is implied by the rails (U2).

## 5. Unresolved decisions

Each is a product-owner or named-owner decision; none is decided here.

- **U1 — Rail of the unqualified "VES" leg.** Only pair 2 names its VES rail; everywhere else "VES" is bare. Two readings: (a) bare "VES" means physical VES cash, consistent with the in-person cash/currency context (`AGENTS.md` line 7) and the catalog's own contrast with "VES in a bank account"; (b) bare "VES" means the asset and the rail is chosen per offer (cash or bank transfer). **Owner: product owner (T01); offer-field mechanics with SP02.**
- **U2 — In-person meeting for fully-digital pairs.** Must a Zelle↔USDT (or other remote-leg) pair still produce an in-person meeting, or may it be fulfilled entirely remotely? **Owner: product owner (T01), with SP07 (trust/safety) and SP04 (incidents).**
- **U3 — Zelle eligibility and legal/commercial use.** Who must hold a US Zelle-enrolled bank account, and whether Zelle's terms permit this marketplace use. **Owner: product owner + legal advisor (SP08).**
- **U4 — USDT network/chain, wallet handling, confirmations, fees.** Which chain(s), address/memo handling, confirmation policy, fee bearer, and the explicit no-custody boundary. **Owner: product owner + payments/backend (SP08, SP09, T02).**
- **U5 — Ordering and trust for remote legs.** Who acts first on an irreversible remote leg, with no escrow. **Owner: trust & safety (SP07) + product (SP04).**
- **U6 — Single method enum vs (asset, rail) in the typed criteria.** The existing contract uses one method enum (`docs/flows/search-and-contact.md` lines 36–44), which cannot express both VES rails; whether search criteria and offer contracts adopt the two-axis model is open. **Owner: product + search backend (SP06, T02).**
- **U7 — Canonical labels/enum values** for the matrix (e.g., `VES_CASH` vs `VES_BANK_TRANSFER` vs `VES`; `USDT_TRANSFER`; `ZELLE`). **Owner: product owner (T01) / T02 contracts.**
- **U8 — Margin representation for same-asset pairs (2 and 5).** Whether the seller margin is expressed as an amount or an implied rate when no currency conversion occurs. **Owner: SP02 (pricing) — out of scope for this spike.**

## 6. Product and technical impact

**Product.**

- The matrix feeds T01's "complete catalog of directional MVP pairs" (`/tmp/backlog2.md` line 110) and is the reference for offer direction labels, search filters, and the LLM's pair criteria.
- The catalog is closed at ten (`/tmp/backlog2.md` line 40); free-text search must map to these pairs and never invent one (SP06/SP12; `docs/flows/search-and-contact.md` line 47).
- The same-asset pairs (2 and 5) clarify that some "exchanges" are cash-in/cash-out form conversions, which matters for how a seller describes an offer and how the margin is shown.
- The seller margin remains distinct from the platform's zero per-exchange commission (`/tmp/backlog2.md` lines 110, 112).

**Technical.**

- Direction is an ordered `(give, receive)` pair drawn from a fixed allowlist of ten; a leg carries `(asset, rail, delivery)`. This should be a domain enum/allowlist with a database constraint that rejects any tuple outside the catalog — the concrete schema is T02/SP09 work, not decided here.
- The existing typed criteria (`docs/flows/search-and-contact.md` lines 36–44) use a single method enum and will need reconciliation with the two-axis model (U6).
- No custody, settlement, or escrow code exists or should be added; the exchange record stays coordination-only (`docs/architecture.md` line 49).
- Monetary handling follows the repo rules (numeric/integer minor units, explicit scale/currency; `AGENTS.md` line 45); this spike defines no rate or rounding (SP02).

## 7. Testable scenarios

Suitable for future end-to-end coverage per `docs/testing/e2e.md` (lines 56–73).

- **WHEN** the catalog is enumerated **THEN** exactly ten directional pairs exist and each maps to a unique `(give, receive)` tuple.
- **WHEN** a buyer searches "necesito 50 dólares por Zelle" **THEN** the criteria resolve to the approved pair Zelle → USD cash (pair 5) and no unapproved pair.
- **WHEN** a request maps to a direction outside the catalog (for example USD cash → Zelle, or VES cash → VES cash) **THEN** it is rejected as unsupported rather than silently added.
- **WHEN** an offer declares pair 2 (VES bank account → physical VES cash) **THEN** the buyer's leg is a digital bank transfer and the received leg is physical cash, and the matrix classifies it as hybrid.
- **WHEN** an offer has a Zelle leg **THEN** the leg's asset is USD and its rail is Zelle; the system does not treat Zelle as an asset or currency.
- **WHEN** an offer has a USDT leg **THEN** the leg is a digital on-chain transfer and the platform records no custody of the token.
- **WHEN** a leg is the unqualified "VES" and U1 is unresolved **THEN** the system does not silently default the rail; the rail must be specified (or the approved default applied).
- **WHEN** both legs are digital (Zelle → USDT) **THEN** the flow is classified as fully remote and does not require an in-person meeting unless U2 decides otherwise.

## 8. Sources reviewed

- `AGENTS.md` (repository root) — lines 7, 11, 45.
- `/tmp/backlog2.md` — lines 36–41 (SP01), 106–116 (T01), 175–180 (T09).
- `README.md` — lines 3, 7, 9, 19, 55.
- `docs/architecture.md` — lines 43–53, 57.
- `docs/flows/search-and-contact.md` — lines 31–47, 49–55.
- `docs/flows/seller-offer-lifecycle.md` — lines 28–36.
- `docs/flows/authentication.md` — lines 1–3, 41 (context only; no pair semantics).
- `docs/testing/e2e.md` — lines 1–6, 56–73, 90–96.
- `openspec/specs/testing/e2e-foundation/spec.md`; `openspec/config.yaml` — lines 8–10, 26–31.
- `docs/audit/t00-baseline.md` — lines 493–506.
- `docs/spikes/README.md` — lines 9–53.
- `apps/api/README.md` — lines 3, 17.
- `.devin/plans/plan-f9b26249875335a0.md` — lines 13–14 (context only; no pair semantics).
- Backlog source page: `https://app.notion.com/p/d358155c3492473581e0c058e08e3b36` (TUDOLAR sequential plan; SP01, T01).
