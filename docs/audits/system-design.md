# TUDOLAR — system design audit

Audit of the shape of the system — module boundaries, contracts, the data model, and the recorded
decisions (ADR-0001–0025) — against the product the repository describes: a mobile P2P marketplace
for in-person cash and currency exchanges, one market, five directional pairs, and a publish → find →
converse → agree → complete loop. This is a review. Nothing here was changed: no code, ADR, spec, or
configuration was touched, and no git command was run. Every claim is either read from a file at the
line cited or marked as unverified.

Read first: `AGENTS.md`, `docs/architecture.md`, `README.md`, `docs/adr/README.md` and
`docs/adr/0001`–`0025`, and
`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md` (the contracts just frozen).
The companion `docs/audits/scalability.md` already covers load behaviour (in-memory pagination,
missing offer indexes, unconfigured timeouts); this audit does not repeat it and cites it where the
two meet.

---

## Verdict

The design holds where it is most expensive to be wrong — the layer boundaries are drawn at real
seams, the deferrals are clean, and the one invariant that matters most for trust (confirmed terms
cannot be silently changed) is enforced by the database itself — but the contracts frozen in T02
froze the **shape of the terms version** while leaving the **aggregate that owns it**, the **inventory
that gates it**, and the **read model search needs** undefined, so the offer has been reduced to a
pointer (`{id, currentTermsVersionId}`), the reservation that prevents oversell has no owner, port, or
column anywhere in the frozen set, and the next three tasks (T03 data foundation, T04 markets, T09/T10
offers/search) each hit a gap the contracts were meant to close. The system will not fall apart, but
it has painted itself into a corner in one place: T03 is labelled "Prisma and the data foundation"
while the frozen contracts give it almost no business schema to implement, which means the most
consequential invariants in the product (no oversell, market containment, comparable rates) will be
designed *after* the contracts that were supposed to fix them — the exact "two agents build two
different things" failure T02 existed to prevent. Two recorded decisions are in visible tension with
each other or with the code (ADR-0003 vs ADR-0005 on the search-criteria shape; ADR-0008's delegated
rate-normalization convention, dropped by T02), and one leaves a dead state in the publish gate
(ADR-0013's `contact_verified`). None of these is fatal; all are cheap now and expensive after T03.

---

## Findings, ordered by severity

### Structural (expensive to change once T03/T09/T13 land)

#### S1 — The offer aggregate is not in the contract, and the inventory reservation has no owner, port, or column

- **Evidence.** The frozen `Offer` is a pointer only:
  `apps/api/src/offers/domain/offer-terms-version.ts:40-43` (`Offer = { id, currentTermsVersionId }`).
  `apps/api/src/offers/application/offers.ports.ts:19-29` exposes only `findById` and
  `pointAtCurrentVersion` — no reserve, release, or availability read. No inventory model, counter, or
  CHECK exists in `apps/api/prisma/migrations/` or `apps/api/prisma/schema.prisma`. Yet
  `openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:118` assigns "inventory
  counters" to `offers`, ADR-0012 and ADR-0011 C1–C3 require reservation release on mutual cancel /
  moderation / 24 h expiry, and `docs/spikes/SYNTHESIS.md:154-171` specifies the model in detail
  (`initial_amount` immutable, `reserved_amount`/`completed_amount` stored, `available` derived, a
  compare-and-swap guard, CHECKs, and an asserted reconciliation).
- **Design issue.** The product's central atomic invariant — do not oversell an offer — is the one
  thing the frozen contract does not model. The offer aggregate has no `marketId`, `sellerId`,
  `status`, `description`, or amounts, so it cannot even be rendered or scoped.
- **Consequence if unaddressed.** T03/T09/T13 must each design part of the same invariant with no
  shared contract; the CAS discipline that SP03/SP04/SP09 independently converged on is likely to be
  re-derived (or missed) per adapter, and the CHECK constraints the decisions require may never be
  written. Oversell becomes possible and undetectable until an incident.
- **Recommendation.** Before T03 starts, freeze an `Offer` aggregate (id, `marketId`, `sellerId`,
  `status`, description/details, `initialAmount`, `reservedAmount`, `completedAmount`; `available`
  derived) and a reservation port (`reserve`/`release` with the compare-and-swap semantics), and add
  the counters' CHECKs to the migration that creates the table. This is the single highest-value
  contract to add.

#### S2 — The offers/exchanges split puts one invariant and one concept across two modules with no single owner, and models the agreement's terms reference twice

- **Evidence.** The agreement's terms reference is declared in two places:
  `apps/api/src/offers/domain/agreement-terms.ts:18-22` (`AgreementTermsReference`) and
  `apps/api/src/exchanges/domain/exchange-state.ts:25-31` (`Agreement` with `termsVersionId`).
  ADR-0001 makes `offer_terms_versions` the source of truth and scopes it to the offer, but the
  agreement *aggregate* lives in `exchanges` (`design.md:121`) while the reference type lives in
  `offers`. ADR-0011 requires the reservation (offers) to be released by an agreement transition
  (exchanges), so the two modules mutate one invariant.
- **Design issue.** One concept has two types; one invariant has two owners. Neither module owns "the
  reservation lifecycle" end to end.
- **Consequence if unaddressed.** Every change to the agreement's reference or the reservation rules
  touches both modules; a reviewer cannot tell which module is authoritative; the duplicated type
  will drift.
- **Recommendation.** Decide the ownership explicitly and write it in one place: either the
  reservation is an offers-owned port that `exchanges` calls on state transitions, or the agreement
  owns the reservation and offers exposes counters as a projection. Delete one of the two reference
  types; keep the terms-version reference in the module that owns the terms version (offers) and have
  `exchanges` import it.

#### S3 — `offer_terms_versions` is created by raw SQL but is not in `schema.prisma`, so Prisma does not own it (ADR-0019)

- **Evidence.** The table is created by hand in
  `apps/api/prisma/migrations/20261017200000_offer_terms_versions_immutability/migration.sql:19-34`,
  and no `OfferTermsVersion` model exists in `apps/api/prisma/schema.prisma` (verified: a search for
  `OfferTermsVersion|model Offer` returns no match). The e2e test reads and writes the table only
  through `$queryRaw`/`$executeRaw`
  (`apps/api/test/e2e/offer-terms-version-immutability.e2e-spec.ts:59-68,92-96`).
- **Design issue.** ADR-0019 makes Prisma the sole schema authority, but a core business table is
  unmodelled. `AGENTS.md:47` allows raw SQL only where Prisma has no equivalent; a terms-version read
  is not such a case. Worse, when T03 adds the model, `prisma migrate dev` will try to `CREATE` a
  table that already exists, so T03 must reconcile by hand or the schema will drift.
- **Consequence if unaddressed.** Every terms-version query is raw SQL forever, and T03 either fails
  its migration or silently accepts drift — the same class of defect (`AGENTS.md:45`) T02 just fixed
  for the PostGIS extension.
- **Recommendation.** T03 must add the `OfferTermsVersion` model (and its relation to `Offer`) and a
  `--create-only` migration that reconciles with the existing table (baseline/no-op), then verify
  `prisma migrate dev` proposes no drift and the immutability trigger survives. Record the
  reconciliation in the T03 change so it is not re-discovered.

#### S4 — The publish-gate ports are market-free, pre-committing an answer ADR-0006 and ADR-0013 leave open

- **Evidence.** `apps/api/src/sellers/application/sellers.ports.ts:13-15`
  (`getEligibility(sellerId)`) and `apps/api/src/subscriptions/application/subscriptions.ports.ts:26-28`
  (`resolveEntitlement(sellerId)`) take no market. ADR-0006 ("Left open (product owner): whether
  eligibility and subscription billing are global or market-specific",
  `docs/adr/0006-publish-authorization-composition.md:46-49`) and ADR-0013 E5
  (`docs/adr/0013-mvp-onboarding-and-trust.md:33`) explicitly leave eligibility scope open, and
  `AGENTS.md:9` says "the API validates market scope and seller eligibility on every operation".
- **Design issue.** The frozen port signatures answer a question the decisions did not, by omitting
  the market. `AGENTS.md:78` also requires authorizing on every resource, including scope.
- **Consequence if unaddressed.** If eligibility turns out market-scoped (a real possibility once a
  second market exists), both port signatures, the gate composition in the offers use case, the Nest
  DI wiring, and every adapter change together — a cross-module rewrite of the publish path.
- **Recommendation.** Carry the market on the gate inputs now (a `MarketScope`/`marketId` parameter),
  so the open question becomes a value change rather than a signature change — or close the question
  by recording that eligibility is global and cite it.

#### S5 — The market predicate is an equality on `market_id`, not the geographic containment the decisions require; the polygon has no read/containment port

- **Evidence.** `apps/api/src/markets/domain/market-predicate.ts:101-127` emits only
  `offers.market_id = $1` and, optionally, `ST_DWithin(...)`; there is no polygon containment.
  ADR-0017 J5 requires the 5 km default "bounded by the market polygon"
  (`docs/adr/0017-mvp-location-and-search-defaults.md:28`) and SP05 requires `ST_Covers` plus
  `market_id` as a mandatory predicate (`docs/spikes/SYNTHESIS.md:15`). The polygon is an
  `Unsupported("geometry")` column introduced with the first spatial table
  (`apps/api/src/markets/domain/market.ts:9-13`), and `MarketRepositoryPort`
  (`apps/api/src/markets/application/markets.ports.ts:14-17`) exposes only `findById`/`exists` — no
  polygon, no containment.
- **Design issue.** "GPS narrows, never expands" and "bounded by the market polygon" cannot be
  enforced by the frozen builder; a hint that resolves outside the polygon has no governed path.
- **Consequence if unaddressed.** T04/T10 will either add a second, ungoverned spatial path — which
  re-opens ADR-0023's "no query can return an out-of-market offer" — or change the builder and the
  port, invalidating the tests that currently assert co-location.
- **Recommendation.** Extend the market predicate to emit the polygon containment
  (`ST_Covers(markets.polygon, point)`) in the same `WHERE` as `market_id`, and add a
  `MarketRepositoryPort` method that returns the polygon or answers containment. Then ADR-0017 J5 and
  ADR-0002's out-of-node behaviour have a home.

#### S6 — The search contract is too thin to serve the results list, forcing the N+1 that `AGENTS.md` forbids

- **Evidence.** `apps/api/src/search/application/search.ports.ts:20-31` returns
  `SearchMatch = { offerId, distanceMeters }`; `apps/api/src/offers/adapters/in/http/offer.dto.ts:9-13`
  returns `OfferDto = { id, pairId, currentTermsVersionId }`. There is no offers read port that
  search can call for a summary, and no batch read.
- **Design issue.** The "find" flow (`docs/flows/search-and-contact.md:18-21`) needs a list of cards
  with pair, amounts, rate, and distance, plus a seller summary. The frozen contracts return IDs only,
  and the offer DTO carries no terms at all — so even a single fetch cannot render a card.
- **Consequence if unaddressed.** The results screen either N+1s (search → offer → seller per row),
  which `AGENTS.md:55` forbids, or the adapter invents a fat search result that bypasses the frozen
  contract. Both are rework in T10.
- **Recommendation.** Freeze a search result item carrying a denormalized offer summary (pair,
  amounts, rate, expiry, distance) and a public seller summary, or add a batch `getOffersByIds` port
  plus a richer offer detail DTO. Do it before T09/T10 so the read model is one decision, not two.

#### S7 — The terms-version table carries no CHECK constraints for the bounds the ADRs define

- **Evidence.** `apps/api/prisma/migrations/20261017200000_offer_terms_versions_immutability/migration.sql:19-34`
  declares `pair_id TEXT`, `margin_pct NUMERIC(5,2)`, `give_amount`/`receive_amount`/`min_amount`/`max_amount`
  as `NUMERIC(24,6)` and `rate NUMERIC(24,8)`, with no `CHECK`. ADR-0010 B1 bounds margin to
  `0 ≤ m < 100`, B5 sets a floor of `> 0` and min/max, and ADR-0009 fixes the five pair ids
  (`docs/adr/0010-mvp-pricing-and-offer-terms.md:23-32`).
- **Design issue.** The database accepts an arbitrary `pair_id`, a negative or ≥100 margin, zero or
  negative amounts, and `min_amount > max_amount`. `AGENTS.md:49` says not to rely only on
  application code for invariants the database can enforce; the same `--create-only` class already
  carries CHECKs in the identity migration
  (`apps/api/prisma/migrations/20261015150121_init_identity_schema/migration.sql:149-165`).
- **Consequence if unaddressed.** Every bound is "likely" rather than "enforced"; a bad row can only
  be caught by an application path that may not exist yet.
- **Recommendation.** Add hand-written CHECKs in the same migration class: `pair_id IN (...)` (the
  five ids), `margin_pct >= 0 AND margin_pct < 100`, amounts `> 0`, `min_amount <= max_amount`,
  `version >= 1`, and the per-asset scale where it can be expressed. Verify against `pg_constraint`
  per `AGENTS.md:45`.

#### S8 — ADR-0008's delegated rate-normalization convention is missing from the frozen contract

- **Evidence.** ADR-0008 requires the rate to be "a single canonical scalar per direction — with a
  defined denominator and unit — rather than two raw amounts or a description. The normalization
  convention is a T02 contract detail; the field itself is not optional"
  (`docs/adr/0008-seller-sets-commercial-values.md:34-38`). T02's design defines only "Money is an
  exact decimal plus its asset" and never the rate's denominator or unit
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:84-85`); the migration
  stores `rate NUMERIC(24,8)` with no unit.
- **Design issue.** A T02-assigned detail was dropped. ADR-0008 says search "filters and orders by"
  the rate; ordering by a scalar with no defined denominator is not honest comparison.
- **Consequence if unaddressed.** Two offers cannot be compared as numbers — the exact purpose
  ADR-0008 gives the normalization — and the search order is arbitrary. T10 will invent a convention
  or ship a misleading sort.
- **Recommendation.** Define the convention now (for example, "units of the receive asset per 1 unit
  of the give asset, at the receive asset's minor-unit scale") and record it as an ADR or a contract
  line, so the sort and the filter share one definition.

#### S9 — The margin field has no anchor once the reference rate is removed (ADR-0008 vs ADR-0010 B1)

- **Evidence.** ADR-0008 says the platform publishes no reference rate and derives none
  (`docs/adr/0008-seller-sets-commercial-values.md:20-22`) yet keeps "the seller margin … a
  first-class field" (`:32-33`). ADR-0010 B1 makes it "a percentage the seller sets, bounded to
  `0 ≤ margin < 100`" (`docs/adr/0010-mvp-pricing-and-offer-terms.md:23`). The terms version stores
  `rate`, `marginPct`, `giveAmount`, and `receiveAmount` together
  (`apps/api/src/offers/domain/offer-terms-version.ts:29-34`).
- **Design issue.** For a conversion pair, a percentage margin is relative to nothing the system
  knows (the reference it used to be relative to was removed), so it can be neither computed nor
  validated; and the four stored numbers can disagree with no rule to reconcile them.
- **Consequence if unaddressed.** `marginPct` is a free number the UI cannot explain, and a seller
  can submit give/receive/rate/margin that are mutually inconsistent with no rejection — the
  redundancy ADR-0008's "single canonical scalar" was meant to avoid.
- **Recommendation.** Either drop `marginPct` from conversion pairs and keep it only for the
  same-asset pair (B2, where it is the seller's compensation), or define the base the percentage is
  taken against. Record the choice in an ADR; do not leave two unreconciled commercial fields.

#### S10 — The search-criteria schema exposes two `Leg`s, contradicting ADR-0005, and is not closed over valid pairs

- **Evidence.** ADR-0005 says "the API and the search criteria expose a single **closed pair id**
  derived from those axes, because validation needs a flat allowlist"
  (`docs/adr/0005-pair-and-rail-representation.md:32-35`). The code instead exposes
  `direction: { give: Leg, receive: Leg }`
  (`apps/api/src/search/domain/search-criteria.ts:23-27`), and the five pair ids are a separate
  closed set (`apps/api/src/catalog/catalog.ts:25-30`).
- **Design issue.** Two recorded decisions disagree about the shape the wire uses (ADR-0003's
  `direction{give,receive}` vs ADR-0005's pair id), and the two-leg shape can express combinations
  that are not in the catalog (for example `USDT_TRANSFER → VES_BANK_TRANSFER`) with nothing to
  reject them — so the "closed" schema is not closed.
- **Consequence if unaddressed.** A criteria object can name a pair the catalog does not contain; the
  deterministic query (T10) must defensively reject it, and the deferred parser (ADR-0015) emits a
  shape the API does not actually accept.
- **Recommendation.** Make the criteria carry the derived `PairId` (validated via `getPair`), or keep
  the legs but add an explicit pair-resolution/validation step that rejects non-catalog combinations;
  reconcile ADR-0003 and ADR-0005 in a single record.

#### S11 — No geocoding / location-resolution port exists, though the flow requires text → point and market containment

- **Evidence.** The criteria carry `hintText` and `radiusKm`
  (`apps/api/src/search/domain/search-criteria.ts:29-33`); the spatial predicate needs
  `{ longitude, latitude, radiusMeters }` (`apps/api/src/markets/domain/market-predicate.ts:36-41`).
  Nothing converts between them. `docs/architecture.md:40` leaves the maps/geocoding provider "TBD",
  and `docs/flows/search-and-contact.md:44` requires resolving the area and checking it is inside the
  selected market.
- **Design issue.** A concept the domain needs is missing from the contract: where a location hint
  becomes a point, and where `radiusKm` becomes meters.
- **Consequence if unaddressed.** T10 invents the geocoding seam (and its provider port) inside the
  search adapter, so a future LLM parser and the manual filters may resolve locations differently; the
  out-of-market behaviour (ADR-0002/0017 J2) has no defined trigger.
- **Recommendation.** Freeze a geocoding/location-resolution port (behind search or markets) and a
  resolution step in the search contract, and name the out-of-market behaviour (whole-market fallback
  vs a coded `400`) so ADR-0017 J2 has a place to attach.

#### S12 — The quote has no persistence port and no single-use guard

- **Evidence.** `Quote` carries `id, offerId, termsVersionId, buyerId, validUntil, createdAt`
  (`apps/api/src/offers/domain/quote.ts:19-26`); `confirmQuote` checks only the clock
  (`:69-79`). `offers.ports.ts:16-29` declares no `QuoteRepositoryPort`, and nothing marks a quote
  consumed.
- **Design issue.** The quote is the object a confirmation binds to (ADR-0010 B3), but it cannot be
  stored and can be confirmed repeatedly.
- **Consequence if unaddressed.** One 15-minute quote could spawn several agreements; the agreement
  cannot reference the quote it came from; the "confirmation binds to the quote it was shown" rule is
  unenforceable.
- **Recommendation.** Add a `QuoteRepositoryPort` and a consumed/used marker (or a unique
  `(offerId, buyerId)` active-quote constraint), and have the agreement store its `quoteId`.

#### S13 — The publish request cannot express the terms ADR-0010 requires, and the offer has no description/details

- **Evidence.** `PublishOfferRequest = { sellerId, pairId, giveAmount, receiveAmount }`
  (`apps/api/src/offers/application/offers.ports.ts:41-47`). The frozen terms-version contract
  includes `rate`, `marginPct`, `minAmount`, `maxAmount`, and `expiresAt`, and non-material
  "description, details" edits update the offer in place
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:92-96`).
- **Design issue.** The publish input cannot build the first terms version, and description/details
  have no home in any contract.
- **Consequence if unaddressed.** T09 extends the request (a wire change) or the use case fabricates
  defaults the decisions do not authorize.
- **Recommendation.** Extend the publish input to the full material field set (rate, margin, min,
  max, expiry) and add the non-material fields to the offer aggregate in the same contract pass as S1.

#### S14 — T03 is unbounded: the frozen contracts omit almost all of the marketplace schema

- **Evidence.** `apps/api/prisma/schema.prisma` contains only the identity tables; the only business
  migration is `offer_terms_versions`. The module table (`design.md:111-122`) assigns offers, terms
  versions, quotes, inventory counters, markets, eligibility, agreements, conversations, and reports
  to modules whose adapters "land with T04, T08–T14". T02's own proposal says "T03 (Prisma and the
  data foundation) … wait for T02" (`openspec/changes/archive/2026-10-17-t02-technical-contracts/proposal.md:6-7`).
- **Design issue.** The task labelled "data foundation" must design the entire marketplace schema and
  its atomic guards, because the contracts above (S1, S2, S7, S12) did not.
- **Consequence if unaddressed.** The failure T02 was created to prevent — two implementers inventing
  different shapes from the same evidence — is deferred into T03, where the invariants are harder to
  see and the tests come later.
- **Recommendation.** Either expand T03's change to include the aggregate and counter design
  explicitly (with the CHECKs and the CAS), or insert a small contract-completion task before T03.
  Do not let T03 invent the invariants silently.

#### S15 — Blocking has no contract home, though E3 makes it account-wide

- **Evidence.** ADR-0013 E3 makes blocking "mutual and account-wide"
  (`docs/adr/0013-mvp-onboarding-and-trust.md:30`). `Block` exists
  (`apps/api/src/reports/domain/report.ts:32-35`), but the conversation port
  (`apps/api/src/conversations/application/conversations.ports.ts:15-22`) has no block check, and the
  search port (`apps/api/src/search/application/search.ports.ts:26-31`) has no exclusion.
- **Design issue.** A cross-cutting invariant (a blocked pair must not see each other's offers or
  converse) has no owner in the contracts; it must be remembered by every adapter.
- **Consequence if unaddressed.** Blocking is enforced inconsistently or not at all; a blocked user
  can still find the blocker's offers or open a conversation.
- **Recommendation.** Freeze where blocking is evaluated (a shared predicate in `reports` consumed by
  `search` and `conversations`, or a check in each read path), and add it to the module table's
  "consumes" column so it is not a silent per-adapter decision.

### Cosmetic (cheap to change; fix opportunistically)

#### C1 — `SearchCriteriaDto = SearchCriteria` exposes the domain type as the wire contract

`apps/api/src/search/adapters/in/http/search.dto.ts:9` aliases the domain interface, so the parser's
`confidence`/`unresolved` internals are part of the wire and a domain change is a breaking change.
`AGENTS.md:71-73` asks for HTTP DTOs inside inbound adapters. Define a DTO and map.

#### C2 — `docs/flows/search-and-contact.md:38-41` still uses the pre-ADR-0005 shape

The example shows `direction: { give: "USDT", receive: "USD_CASH" }` — the flat single-value enum
ADR-0005 superseded — and treats a rail (`USD_CASH`) as an asset. Update it to the catalog form.

#### C3 — `common` is declared to consume `catalog`, but no `common` file imports it

`design.md:114` lists the edge; no file under `apps/api/src/common/` imports `catalog`. Either
correct the table or drop the edge (no functional impact).

#### C4 — `Offer.currentTermsVersionId` is nullable with no defined null meaning

`apps/api/src/offers/domain/offer-terms-version.ts:42` allows `null`, but a published offer always has
a current version. State whether `null` means "draft" and model it, or make it non-null.

#### C5 — `Conversation` has no `createdAt` and no per-(offer, buyer) uniqueness

`apps/api/src/conversations/domain/conversation.ts:11-16` lets a buyer open many conversations on one
offer. Add a uniqueness rule or accept it deliberately.

#### C6 — The markets domain encodes the offers module's physical schema

`apps/api/src/markets/domain/market-predicate.ts:25-29` hardcodes the `offers` table and its
`market_id`/`location` columns inside the markets domain. ADR-0023's co-location rule forces this, but
it means the two modules' schemas are coupled at the domain layer. A comment or an explicit ownership
note would prevent a future edit from changing one and not the other.

#### C7 — `Entitlement.source` provenance leaks through the port type

`apps/api/src/subscriptions/adapters/in/http/subscription.dto.ts:1` imports the port's `Entitlement`;
the mapper correctly drops `source` (`:13-14`), so this is only a naming/ownership note — the port
type doubles as the DTO source.

---

## The design is right here

These are correct, load-bearing, and should not be revisited.

- **ADR-0001 — terms versions belong to the offer, insert-only, enforced by the database.** The
  parent is right (an offer edit cannot reach a confirmed agreement), and the trigger
  (`.../20261017200000_.../migration.sql:43-58`) makes it a database invariant rather than a
  convention, which is what `AGENTS.md:41` asks for. The e2e test asserts the database object, not
  application discipline (`.../offer-terms-version-immutability.e2e-spec.ts:52-99`).
- **ADR-0006 — the publish gate is composed in the offers use case from two ports, and three concepts
  keep three names.** `AccountStatus`, `SellerEligibility`, and entitlement stay distinct, the
  composition lives in the use case (not the controller, not either module), and the code honours it
  (`apps/api/src/offers/application/offers.ports.ts:36-39`). This is exactly what `AGENTS.md:72,76`
  requires.
- **ADR-0014 and ADR-0015 — deferral by port.** Subscriptions are deferred with the entitlement port
  left real and exercised (`apps/api/src/subscriptions/subscriptions.module.ts:19-32`), and the
  natural-language parser port is defined but wired nowhere
  (`apps/api/src/search/application/search.ports.ts:33-46`). These are the cleanest possible
  deferrals: implementing either later is adding an adapter, not reshaping a contract. No rewrite
  risk.
- **ADR-0016 — selling is a state, not an account type.** No `accountType` exists, eligibility is the
  gate, and the demo differs by seeded eligibility. This is the model subscriptions will attach to
  unchanged.
- **ADR-0019 and ADR-0023 — one migration authority, with PostGIS inside it.** The divergence T00
  recorded (the extension outside `prisma/migrations`) is genuinely resolved: the extension is now a
  `--create-only` migration plus a startup assertion
  (`apps/api/src/database/postgis-extension.ts:16-40`), and the schema header states the truth
  (`apps/api/prisma/schema.prisma:1-12`).
- **ADR-0023 — the market predicate is co-located with the proximity predicate in one `WHERE`.** The
  builder cannot emit proximity without market scope
  (`apps/api/src/markets/domain/market-predicate.ts:101-127`), and the tests prove it
  (`apps/api/src/markets/domain/market-predicate.spec.ts:64-78`). This is the right shape; only the
  containment predicate is missing (S5).
- **ADR-0010 — money is exact, rounded once, server-side.** `Money` holds integer minor units with no
  binary floating point, rejects inexact values rather than truncating them, and exposes one rounding
  step (`apps/api/src/catalog/money.ts:59-133`). This is precisely `AGENTS.md:51`.
- **ADR-0009 and ADR-0005 — five canonical pairs on two internal axes, one closed id externally.** The
  catalog is frozen, `AGENTS.md:7`'s "no pair without a new decision" holds, and the two VES rails are
  distinguishable. Only the *search-criteria* exposure diverges (S10).
- **ADR-0002 — search location is optional.** The whole-market fallback is the fixed behaviour, and it
  is the honest one.
- **ADR-0011 C1 — no unilateral release of a reservation.** The anti-abuse choice is right: an
  incident report must not hand one party a way to free inventory.
- **The shared contracts — error envelope with a closed code enum, cursor pagination shape, the
  required `X-Market-Id` header, and the `/v1` prefix.** One error shape
  (`apps/api/src/common/errors/error-envelope.ts:10-17`), one page shape
  (`apps/api/src/common/pagination/cursor-pagination.ts:10-13`), a validated market header that
  never silently defaults (`apps/api/src/common/market-context/market-context.guard.ts:32-50`), and
  URI versioning set once (`apps/api/src/main.ts:8`). These are the contracts T02 existed to freeze,
  and they are frozen well.

---

## Deferrals: clean or a hidden rewrite?

- **Subscriptions (ADR-0014) — clean.** The port stays, the temporary adapter returns "entitled", and
  the test adapter is refused outside `NODE_ENV=test`
  (`apps/api/src/config/env.validation.ts:139-149`). The publish gate is composed and exercised
  rather than stubbed. Landing subscriptions later means implementing the port and adding plans/limits
  behind it; no contract reshapes. The one caveat is S4 (the port is market-free), which is a scope
  question, not a deferral defect.
- **Natural-language search (ADR-0015) — clean.** The parser port is defined, unimplemented, and
  wired nowhere. The deterministic search (T10) is independent of it. No rewrite risk. Caveat: the
  parser's output type is the same `SearchCriteria` S10 flags, so if the criteria shape changes to
  pair ids the parser's contract changes too — the same change, not a rewrite.
- **MVP decisions ADR-0009–0018 — mostly clean, three to watch.** The catalog (0009), pricing
  (0010), agreement rules (0011), no-replenishment (0012), account-as-state (0016), location defaults
  (0017), and no-earnings (0018) are cheap to honour and consistent with the code. The ones that will
  feel contact with the real product:
  - **ADR-0013 E1 (no contact verification to publish)** is honest and explicitly a pilot relaxation,
    but combined with S4 and the eligibility lifecycle it means the gate reduces to "not
    suspended/rejected" for a real user. `mayPublish` requires exactly `eligible`
    (`apps/api/src/sellers/domain/seller-eligibility.ts:22-23`), and nothing in the contract lets a
    non-seeded user reach it — `contact_verified` has no input in the MVP (ADR-0013's own incoherence
    note, `docs/adr/0013-mvp-onboarding-and-trust.md:52-59`). The obligation to verify before launch
    is recorded, so this is a pilot gap rather than a defect, but the eligibility *lifecycle* should
    be written down (who grants `eligible`, and how) before a real seller signs up.
  - **ADR-0012 (no replenishment)** makes an offer's availability monotonically decreasing; an offer
    that sells out is dead until it expires. At pilot scale with a 7-day default that is acceptable,
    but it makes the expiry the only supply refresh — worth watching.
  - **ADR-0017 J4 (location never persisted)** is privacy-positive and cheap, but it means no
    location-based personalization or history; fine for the MVP, and it is a product choice, not a
    design gap.

---

## The path to the MVP: longer, and where it blocks

The backlog's next tasks are T03 (Prisma/data foundation) and T15 (mobile shell), then T04 (markets),
T05, T06/T07, T09/T10, T18. The current design makes this path **longer**, not shorter, because the
frozen contracts stopped at the terms-version shape:

- **T03 — blocked in spirit by S1, S3, S7, S14.** The data foundation has almost no business schema to
  implement, so it becomes a design task: the offer aggregate, the inventory counters and their CAS,
  the quote table, and the reconciliation of `offer_terms_versions` with Prisma. This is the near-term
  blocker. It is cheap to fix now (a contract-completion pass) and expensive after T03 ships a schema.
- **T15 (mobile shell) — not blocked.** It is independent; the only couplings are the `/v1` base URL
  (already updated, `apps/mobile/src/services/api.ts:44`) and the missing `X-Market-Id` header, which
  `docs/audits/scalability.md` (L4) already records.
- **T04 (markets) — blocked by S5 and by data, not code.** The frozen `MarketRepositoryPort`
  (`findById`/`exists`) cannot read the polygon or answer containment, so T04 must extend it and the
  predicate. Separately, the Ciudad Ojeda boundary is the OSM Municipio Lagunillas polygon and must be
  **stored as data** with the "© OpenStreetMap contributors" attribution required in the app
  (`docs/spikes/SYNTHESIS.md:151-153`); the source dataset and its licence are still to be picked.
- **T09/T10 (offers/search) — blocked by S1, S6, S8, S11, S12.** Offers needs the aggregate and the
  reservation; search needs the read model, the rate convention, the geocoding port, and a pair-valid
  criteria. Each of these is a contract the frozen set was meant to provide.
- **T05, T06/T07, T18 — not assessable from the repository.** The task names are not in the tree
  (the backlog lives in Notion); I did not find their acceptance criteria in the repo. If any of them
  touches offers, search, or exchanges, they inherit the gaps above. Evidence that would settle it:
  the Notion backlog rows for T05/T06/T07/T18, or a `docs/` note naming what each covers.

**What would settle the uncertain calls.** S1/S2/S14 turn on how T03 is scoped — read T03's change
(if it exists) or its Notion row; if T03 already plans the offer aggregate and counters, S1 is
downgraded to "confirm the contract is frozen before T03 applies". S5 turns on whether a polygon
containment predicate is planned for T04 — check T04's design. S8/S9 turn on whether the rate/margin
convention was recorded elsewhere — I found it nowhere in `docs/adr/`, T02, or the catalog.
