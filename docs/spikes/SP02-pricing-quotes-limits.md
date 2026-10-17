# SP02 — Define Pricing, Quotes, Limits, and Offer Terms

## 1. Task and acceptance criteria

Quoted from the backlog (`/tmp/backlog2.md`, §"SP02 — Define Pricing, Quotes, Limits, and Offer
Terms"):

> **Suggested owner:** Product + marketplace backend. **Depends on:** T00; independent spike,
> parallelizable.
>
> - The seller commission/margin field is a fixed MVP requirement, not a discovery question for this
>   spike. Investigate the reference-rate source/time, direction-specific offer rate, quote validity
>   and refresh, rounding, min/max amount rules, expiry, and the final terms shown to both parties;
>   do not revisit whether the seller field is required.
> - Define which offer fields sellers may edit after publication, how material changes are
>   versioned, and how existing chats/confirmed transactions are protected from changed terms.
>
> **Acceptance criteria:** an approved offer/quote schema and pricing examples cover all pair types;
> edits cannot silently change terms already confirmed by both parties; unresolved commercial
> choices are listed for T01.

Research only. This report proposes the **shape** of the offer/quote/terms model and lists the
commercial choices the product owner must make. It fixes no rate, margin, rounding step, or amount
limit — T01 line 110 says "price/rate rules … still need to be defined" (`docs/spikes/README.md`
"Hard rules").

## 2. Evidence and sources

### Observed

- **No offer/quote/pricing code exists.** `openspec/specs/` holds only `mobile/app-shell`,
  `mobile/design-system`, `testing/e2e-foundation`; `docs/audit/t00-baseline.md` §2.3–2.4 lists only
  `auth`, `users`, `config`, `database` and 6 identity/session Prisma models. A repo-wide search for
  `rate|quote|margin|commission|price|expiry|rounding` matches only docs, specs, UI tokens, and
  unrelated code.
- **Monetary storage rule.** `AGENTS.md:45` — amounts as `numeric`/decimal or integer minor unit,
  never binary floating point, "Define scale, rounding, and currency explicitly"; `AGENTS.md:46` —
  one atomic operation per transaction; `openspec/config.yaml:21-24` repeats this.
- **Revenue model.** `README.md:14-15` — buyers free, sellers pay a monthly subscription, "No
  per-exchange commission is planned." The seller margin on the offer is separate and mandatory
  (T01 line 110, SP02 line 44).
- **Offer attributes in scope.** `README.md:19` — offers by "asset pair, amount, payment method,
  area, and expiration"; `docs/flows/seller-offer-lifecycle.md:9` — draft validation covers "pair,
  assets, amount, methods, expiration."
- **Approved pair catalog (10, buyer's perspective).** T01 line 110: VES → USDT; VES bank →
  physical VES cash; VES → USD cash; VES → Zelle; Zelle → USD cash; Zelle → VES; Zelle → USDT;
  USDT → VES; USDT → USD cash; USDT → Zelle. "No additional pairs are allowed."
- **No 1:1 assumption.** T01 line 110 — "Do not assume a 1:1 rate," including the same-currency
  rail-change pair.
- **Immutability and inventory.** T01 line 110 — the seller sets the initial amount and "cannot
  change it after publication"; availability changes from reservations/completions/cancellations.
  SP03 line 49 — "immutable initial amount after publication; seller-editable description/details";
  SP03 line 50 — each buyer transaction is whole, no partial execution.
- **Terms snapshot/versioning required elsewhere.** SP04 line 55 — "structured terms snapshot and
  version; bilateral confirmation as `confirmed_by_both`; reconfirmation after a terms change";
  SP04 line 56 — no unilateral cancel after confirmation.
- **Both parties see the same terms.** `docs/flows/search-and-contact.md:18` (results show "distance
  and terms"), `:21-23` (both agree before an exchange record is created); T01 line 110 — "each
  transaction consumes the entire agreed amount."
- **Market scope.** `README.md:27`, `AGENTS.md:9` — one offer belongs to one market; chats and
  agreed exchanges inherit that market.
- **LLM boundary.** `AGENTS.md:11`, `openspec/config.yaml:30-31`, `docs/architecture.md:52` — the LLM
  never owns monetary rules or generates prices/rates.
- **No custody/settlement.** `AGENTS.md:11`, `docs/architecture.md:53` — the platform connects
  people but does not custody, settle, or escrow; a quote is a coordination term, not settlement.
- **Hexagonal + Prisma.** `AGENTS.md:37,56-70`, `openspec/config.yaml:15-19` — domain invariants in
  `domain/`, use cases/ports in `application/`, adapters outward; Prisma owns schema and migrations.

### Assumed (not verified)

- **No reference-rate source, provider, config key, or table exists in the repository.** Any
  specific feed (official, parallel, etc.) is a *product* candidate, not an observed integration.
- **Asset identifiers, units, and minor-unit scale per pair are not fixed.** T01 line 110 leaves
  "units" open; the catalog uses display labels (`USD cash`, `USDT`, `Zelle`, `VES`), not ISO codes.
- **No rounding, min/max, or expiry value is decided** — all open in T01 line 110.
- **How the margin is stored** (rate adjustment, percentage, or absolute spread) is undecided; SP02
  fixes only that the *field* is required.

## 3. Options considered

Each option is the *mechanism*; the *values* stay in §5. **[kept]** = defensible on the evidence;
**[rejected]** = conflicts with a cited rule.

### 3.1 Reference-rate source

- **A. Seller free-form, no reference.** *Rejected as the only source* — cannot support comparable
  listings (`README.md:3`) and makes the mandatory margin field meaningless.
- **B. One platform reference per pair (single source + timestamp).** **[kept]** — comparable,
  auditable, one margin axis.
- **C. Multiple sources (e.g., official + parallel), selectable per offer.** **[kept as option]** —
  matches real pricing but the source must be a visible terms field.
- **D. Store margin only; derive and display the effective rate.** **[kept]** — makes the required
  seller margin field (SP02 line 44) first-class.

### 3.2 Reference-rate time

- **A. Frozen at publication.** Stable, trivial; goes stale.
- **B. Captured at quote generation.** Fresh; two buyers can see different numbers.
- **C. Refreshed on a cadence with a stored "as of" time.** Predictable; needs a scheduler.
- **D. Re-validated at bilateral confirmation.** Closest to truth; can surprise a party.

All **[kept as options]**; choice/cadence/tolerance are §5. Structurally, **every quote stores its
source and as-of timestamp** so both parties share one basis (`search-and-contact.md:18,21`).

### 3.3 Direction-specific rate and margin expression

Direction is intrinsic (pairs are `give → receive`, T01 line 110), so a rate must name its direction
and each side's units.

- **A. One effective rate per offer in the offer's direction** (`give_asset/amount`,
  `receive_asset/amount`). **[kept]**.
- **B. Bid/ask pair on one offer.** *Rejected for MVP* — conflates two prices; the catalog treats
  each direction as its own offer.
- **C. Reference rate + explicit margin, effective rate derived.** **[kept]** — the margin field is
  the single adjustable knob. Margin may be a percentage, an absolute spread, or a fixed amount;
  which one is §5.

Pricing examples — **structure only; no real rate asserted**. Let `R_ref` be the pair's reference
rate and `M` the seller margin:

| Pair type | Example | Direction (give → receive) | Rate shape |
| --- | --- | --- | --- |
| Fiat → hard asset | VES → USDT | give VES, receive USDT | `receive = give / (R_ref · (1 + M))` |
| Fiat → hard asset | VES → USD cash / Zelle | give VES, receive asset | same shape |
| Hard asset → fiat | Zelle → VES; USDT → VES | give asset, receive VES | `receive = give · R_ref · (1 − M)` |
| Hard asset → hard asset | Zelle → USD cash / USDT; USDT → USD cash / Zelle | cross rate | `receive = give · R_cross · (1 − M)` |
| Same-currency rail change | VES bank → VES cash | give bank VES, receive cash VES | `R_ref` and whether `M` applies are **unresolved** (no 1:1) |

Concrete sources, margin bounds, and whether `M` may be zero/negative are §5.

> **Correction — `docs/adr/0005-pair-and-rail-representation.md` (spike-interface-reconciliation).** The
> rate rows above are keyed by display labels ("VES → USD cash / Zelle"); the ADR settles the external
> representation as a single **closed pair id** derived from the two internal axes
> (`{asset, rail, delivery}`, ordered `(give, receive)`). Read each row's key as that pair id — the
> label text is not the contract. The companion resolution for the gate that publishes an offer is
> `docs/adr/0006-publish-authorization-composition.md`. The original text is left visible above as
> evidence.

> **Correction — `docs/adr/0008-seller-sets-commercial-values.md` (spike-interface-reconciliation).**
> The platform-reference-rate model in this report is **superseded**. The product owner has decided
> that **the seller sets every commercial value**, and the platform publishes no reference rate and
> derives none. This report's open decisions U1 and U2 (reference-rate **source** and **time**) are
> therefore resolved as **not applicable** — there is no reference to source or timestamp — and `R_ref`
> in the rows above should be read as *the seller's stated rate*, not a platform one. The quote becomes
> the seller's stated terms frozen with a validity window, carrying no reference source and no
> reference as-of time. U5–U8 (quote validity, rounding scale, min/max bounds, expiry) still stand and
> remain the product owner's. The consequence to own deliberately: listings are no longer comparable by
> rate, so no "good deal" signal or value sort is possible, and rate staleness becomes the seller's
> silent risk with offer expiry as its only mitigation. The original text is left visible above as
> evidence.

### 3.4 Quote validity and refresh

- **A. Static offer, no separate quote.** *Rejected as the only mechanism* — no way to bound
  staleness.
- **B. Immutable quote snapshot with a TTL** (pair, amounts, rate, margin, receive amount, source +
  as-of time, `valid_until`). **[kept]** — both parties see identical numbers; fits SP04's snapshot.
- **C. Server-authoritative re-quote on demand.** **[kept]** as a companion to B; needs a rule for
  which quote a confirmation binds to.
- **D. Client-computed price.** *Rejected* — `AGENTS.md:11,83` forbid the client/LLM owning monetary
  calculation.

Validity window, source, and as-of time are **data on the quote**, never recomputed at read time.

### 3.5 Rounding

- **A. Round to the receive asset's minor unit.** **[kept]**.
- **B. Round to a coarse step** (e.g., nearest 5/10). Easier cash handoff; must be disclosed.
- **C. Round in favor of a fixed party.** Deterministic; a disclosed commercial choice.

Scale per asset and rounding mode/direction are §5. Structurally, rounding happens **once,
server-side, at quote creation**, and the rounded value is what both parties see
(`AGENTS.md:45` "define scale, rounding").

### 3.6 Min/max amount rules

- **A. Per-offer min/max set by the seller.** Flexible; needs platform bounds.
- **B. Platform-wide min/max per asset or pair.** One rule; ignores seller capacity.
- **C. Plan-based limits.** Ties to the revenue model (`README.md:14`); must not contradict A/B.
- **D. Platform bounds ∩ plan cap ∩ seller min/max.** **[kept as likely shape]** — enforced
  server-side (`seller-offer-lifecycle.md:31`). Numeric bounds and plan caps are §5 (depend on SP08).

The initial amount is **not** part of min/max editing: immutable after publication (T01 line 110,
SP03 line 49); min/max must be consistent with it at creation.

### 3.7 Expiry

- **A. Seller-chosen absolute date/time.** Explicit; can be far out.
- **B. Fixed duration from publication.** Predictable; rigid.
- **C. Default duration with a maximum cap.** **[kept]** — seller may shorten; stored as absolute
  `expires_at`.
- **D. Rolling validity from seller activity.** *Rejected for MVP* — hidden state complicates
  deterministic search.

`seller-offer-lifecycle.md:23-24` already models "Expire by time or close manually". Default, cap,
and the offer-expiry vs quote-TTL relationship are §5.

### 3.8 Final terms shown to both parties

A **single snapshot** both parties confirm (SP04 line 55): pair/direction; give and receive
asset/amount (post-rounding); effective rate; reference source + as-of time; seller margin;
offer/terms version; market; meeting-area hint; and the quote's `valid_until`. Buyer and seller
confirmations reference the **same snapshot id and version**, so neither confirms different numbers
(`search-and-contact.md:21-23`).

### 3.9 Fields a seller may edit after publication

- **A. Freeze material fields; only description/details editable.** **[kept]** — matches SP03 line
  49.
- **B. Allow rate/limits/expiry edits that create a new version.** **[kept]** — the only path to
  change material fields.
- **C. Silent edits to material fields.** *Rejected* — violates SP02's acceptance criterion.
- **D. Edit the initial amount.** *Rejected* — T01 line 110, SP03 line 49 make it immutable.

Split: **non-material** (description, details, meeting-area hint, pause) edits in place; **material**
(pair/direction, rate or margin, min/max, initial amount, expiry) requires a new version.

### 3.10 Versioning of material changes

- **A. Immutable offer versions; an edit appends version N+1**; snapshots reference
  `(offer_id, version)`. **[kept]** — auditable; confirmed snapshots never mutate.
- **B. Mutable offer row + audit log.** *Rejected* — weaker immutability guarantee than SP04 needs.
- **C. New offer replacing the old one.** *Rejected* — splits chats/availability, against "one offer
  may serve multiple buyers" (SP03 line 50).

### 3.11 Protecting existing chats and confirmed transactions

- **A. Confirmed transactions pin a snapshot.** Immutable once `confirmed_by_both` (SP04 line 55).
  **[kept]**.
- **B. Open chats get a "terms changed" state.** New version flags unconfirmed chats and requires
  re-confirmation; old snapshot retained. **[kept]** — SP04's "reconfirmation after a terms change".
- **C. Silently update open chats to new terms.** *Rejected* — exactly what SP02 forbids.
- **D. Unilateral cancel of a confirmed transaction to escape old terms.** *Rejected* — SP04 line 56
  forbids it; only mutual cancellation, with inventory released per SP04.

## 4. Recommendation

Adopt a **versioned, snapshot-based offer/quote model**; keep every monetary *value* an open
product decision:

1. An **Offer** owns immutable material fields plus an editable description/details; a material edit
   produces a new immutable **OfferVersion**.
2. A **Quote** is an immutable server-computed snapshot for `(offer, version, buyer)`: pair/
   direction, give/receive amounts (post-rounding), effective rate, reference source + as-of time,
   seller margin, `valid_until`.
3. A **TermsSnapshot** (shared with SP04) references the quote version and is the only object a
   confirmation binds to. Confirmed snapshots are immutable; a new version forces re-confirmation in
   open chats and never touches confirmed transactions.
4. Monetary values are integer minor units or `numeric` with explicit per-asset scale
   (`AGENTS.md:45`); rounding happens once at quote creation; client and LLM never compute a price
   (`AGENTS.md:11,83`, `openspec/config.yaml:30-31`).
5. The seller margin field is stored explicitly (SP02 line 44) and drives the effective rate; its
   expression and bounds are unresolved (§5).

This satisfies the acceptance criteria structurally: the schema covers all five pair *types* (§3.3),
edits are versioned and cannot silently change confirmed terms (§3.9–3.11), and the commercial
choices are enumerated for T01.

## 5. Unresolved decisions

All monetary rules are the product owner's; each row is a T01 input.

| # | Decision | Options | Owner |
| --- | --- | --- | --- |
| U1 | Reference-rate source(s) per pair; official and/or parallel | §3.1 A–D | Product owner (legal/compliance via SP08) |
| U2 | Reference-rate time: publication, quote, cadence, or confirmation | §3.2 A–D | Product owner |
| U3 | Margin expression (percentage, spread, fixed) and allowed bounds/sign | §3.3 C | Product owner |
| U4 | Whether the same-currency rail-change pair carries a rate/margin | §3.3 last row | Product owner |
| U5 | Quote validity window (TTL) and refresh policy | §3.4 B–C | Product owner + backend |
| U6 | Rounding scale per asset and rounding mode/direction | §3.5 A–C | Product owner |
| U7 | Min/max rules: per-offer vs platform vs plan, and numeric bounds | §3.6 A–D | Product owner (plan caps via SP08) |
| U8 | Default offer duration, maximum cap, relation to quote TTL | §3.7 C | Product owner |
| U9 | Asset identifiers, units, minor-unit scale for the 10 pairs | T01 line 110 | Product owner (with SP01) |
| U10 | Exact terms-snapshot field list and visibility (buyer/seller/admin) | §3.8 | Product owner + backend |

## 6. Product and technical impact

- **Product.** Buyers gain comparable, source-labelled rates; sellers gain one margin knob and a
  bounded edit surface. Risk: a distrusted reference source or uncompetitive margin could stall
  adoption — U1/U3 need pilot validation (SP10).
- **Domain/hexagonal.** A new `offers` (and likely `quotes`/`terms`) module: pure domain value
  objects (rate, money-in-minor-unit, rounding) in `domain/`, quote/versioning use cases in
  `application/`, Prisma repositories and HTTP DTOs in adapters (`AGENTS.md:56-70`).
- **Database.** Monetary columns `numeric`/integer with explicit scale; immutability of versions and
  snapshots enforced with `NOT NULL`/`UNIQUE`/`CHECK` where possible (`AGENTS.md:43,45`); any `CHECK`
  is hand-written inside a `--create-only` migration (`AGENTS.md:39`).
- **Concurrency.** Quote creation and confirmation must be atomic and idempotent; snapshot pinning
  must survive concurrent edits/confirmations (SP03 line 49-50, SP04) — a SP09 input.
- **Search.** Listing cards show "distance and terms" (`search-and-contact.md:18`); the displayed
  rate must be the stored effective rate, not a client recomputation.
- **Compliance.** The platform still does not custody or settle (`AGENTS.md:11`); a reference-rate
  display must not imply a guaranteed settlement rate.
- **Out of scope:** choosing rates, providers, or plan caps; implementing anything.

## 7. Testable scenarios

For future end-to-end coverage (API contract + DB state), per `docs/testing/e2e.md`:

1. **Direction-specific rate.** WHEN a seller publishes a VES → USDT offer with a margin, THEN the
   offer shows the effective rate in that direction and the pair's give/receive assets.
2. **Quote snapshot equality.** WHEN a buyer opens a quote, THEN buyer and seller views reference the
   same snapshot id/version with identical amounts and rate.
3. **Quote validity.** WHEN a quote is past `valid_until`, THEN confirming is rejected with a
   controlled error and a fresh quote is required.
4. **Reference as-of time.** WHEN the reference rate changes after a quote exists, THEN the quote's
   stored rate and as-of time are unchanged.
5. **Rounding is server-side and once.** WHEN the receive amount is not exact, THEN the stored value
   equals the server's rounded value and the client displays it unchanged.
6. **Min/max enforcement.** WHEN a buyer proposes an amount below the seller min or above the
   platform/plan cap, THEN the API rejects it and no reservation is created.
7. **Immutable initial amount.** WHEN a seller edits the initial amount after publication, THEN the
   API rejects it.
8. **Material edit creates a version.** WHEN a seller changes rate or min/max, THEN a new version is
   created and the previous version stays readable.
9. **Open chat re-confirmation.** WHEN an offer version changes while a chat is unconfirmed, THEN the
   chat shows a terms-changed state and the old snapshot is retained until re-confirmation.
10. **Confirmed transaction protected.** WHEN a seller edits an offer after a transaction is
    `confirmed_by_both`, THEN the confirmed snapshot is unchanged and no new terms apply.
11. **No unilateral term escape.** WHEN a seller tries to change a confirmed transaction's terms,
    THEN it is rejected and only mutual cancellation is offered (SP04).
12. **Description-only edit.** WHEN a seller edits only description/details, THEN no new version is
    created and confirmed/open terms are untouched.
13. **Expiry.** WHEN an offer passes `expires_at`, THEN it is absent from search and cannot start a
    new quote.

## 8. Sources reviewed

- `AGENTS.md` (product context, monetary storage, transactions, hexagonal layers, React/RTK rules).
- `README.md` (revenue model, MVP scope, offer attributes, market scope, implementation status).
- `/tmp/backlog2.md` — §SP02 (task + acceptance criteria), §SP03, §SP04, §T01 (pairs, no 1:1 rate,
  immutable amount, whole transactions, margin requirement).
- `docs/spikes/README.md` (the protocol followed here).
- `docs/architecture.md`, `docs/flows/seller-offer-lifecycle.md`,
  `docs/flows/search-and-contact.md`, `docs/flows/authentication.md`.
- `docs/testing/e2e.md` (scenario conventions and required evidence).
- `docs/audit/t00-baseline.md` (verified current state: no offer/pricing code or models).
- `openspec/config.yaml` (planning context, monetary and hexagonal rules).
- `openspec/specs/**` (`mobile/app-shell`, `mobile/design-system`, `testing/e2e-foundation`) —
  inspected; none defines offer/pricing behavior.
