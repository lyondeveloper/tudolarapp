# SP11 — Define Seller Transaction History and Daily Earnings

Discovery spike. Research only: nothing in this report was implemented, and no application code or
other file was changed.

## 1. Task and acceptance criteria

Quoted from the backlog snapshot (`/tmp/backlog2.md:92–98`):

> ### SP11 — Define Seller Transaction History and Daily Earnings
> **Suggested owner:** Product + marketplace backend + analytics. **Depends on:** T00; independent spike, parallelizable.
> - Define the seller transaction-history fields, statuses, filters, retention, and privacy rules, including which agreed and completed transaction details are visible to each party.
> - Define “daily earnings”: distinguish received amount/gross transaction volume from profit. The app has no custody, settlement proof, or seller cost basis, so do not label unverified activity as profit.
> - Decide which statuses count in the daily summary, the business timezone/day boundary, and how multiple assets/currencies are displayed. Do not combine currencies without an approved conversion source and timestamp.
> - Specify the immutable transaction data and events needed to compute the history and summary, including bilateral completion and corrections/cancellations.
>
> **Acceptance criteria:** an approved metric/data dictionary defines fields, status inclusion, timezone, currency grouping, privacy, and sample calculations for mixed-asset days; it distinguishes reported transaction activity from independently verified earnings and is ready for T13/F01.

The consumer of this report is **F01** (`/tmp/backlog2.md:246–252`), which depends on T13, T17, and
SP11, and must not label received amount or gross volume as profit unless the approved metric
supports that claim.

## 2. Evidence and sources

### Observed

- **No per-exchange commission; revenue is subscriptions.** `AGENTS.md:7` and `README.md:15` state
  buyers are free and the model is seller subscriptions, "not per-exchange commissions." `README.md:9`
  and `architecture.md:53`: the app "does not custody cash or crypto, settle exchanges, or provide
  escrow."
- **Monetary rules are fixed constraints, not open questions.** `AGENTS.md:45`: "Store monetary
  amounts as `numeric`/decimal or integers in a domain-defined minor unit; never use binary floating
  point for monetary calculations. Define scale, rounding, and currency explicitly."
  `openspec/config.yaml:21–24` repeats it. This binds the history/summary computations.
- **The seller margin field exists and must be displayed, distinct from platform commission.**
  `SP02` (`/tmp/backlog2.md:44`) calls the seller commission/margin field "a fixed MVP requirement,
  not a discovery question." `T09` acceptance (`/tmp/backlog2.md:180`): "seller commission/margin
  field is persisted and displayed, distinct from platform commission." SP02 owns its *semantics*
  (reference-rate source, direction-specific rate, rounding); SP11 only consumes it.
- **The exchange record and its lifecycle.** `T13` (`/tmp/backlog2.md:199–206`): the record is
  created when both parties confirm the same terms version; an immutable snapshot and
  timestamps/statuses are saved; `confirmed_by_both` "does not verify that the exchange occurred or
  mean it is complete"; completion is marked "only after both parties confirm; if they disagree,
  record an incident instead of treating it as complete"; mutual cancellation releases the reserved
  amount; "there is no fund intermediation, custody, escrow, or settlement."
- **The agreement state machine is SP04's.** `SP04` (`/tmp/backlog2.md:53–58`) owns the transition
  table (changed terms, mutual cancel, no-show, safety issues, completion disagreement). SP11 must
  not invent statuses; it consumes SP04's.
- **Privacy boundaries already stated for adjacent surfaces.** `docs/flows/search-and-contact.md:51`:
  "Show approximate distances/meeting areas, never users' home addresses"; `:53`: the exchange
  record "represents mutual agreement and coordination only; it does not process or settle the
  exchange." `docs/flows/seller-offer-lifecycle.md:36`: verification "must not promise that an
  in-person exchange is safe."
- **Money renders with tabular figures.** `openspec/specs/mobile/design-system/spec.md:45–63`: the
  client "SHALL render monetary values with tabular figures so amounts and rates align"; the amber
  set (`#FEF3C7`/`#F59E0B`/`#92400E`) is the role for non-custody and safety notices (`:25–28`).
- **Authorization and retention are cross-cutting requirements.** `AGENTS.md:72`: authenticate and
  authorize every operation on every resource, including IDs from the body; `AGENTS.md:52`: collect
  personal data for a defined purpose, with controlled access and retention.
- **Remote state and presentation layers.** `AGENTS.md:90–93`: RTK Query is the sole server-state
  layer and gluestack the design system; `AGENTS.md:82–88`: keep business rules out of component
  bodies — derive view data with pure functions/use cases.
- **Nothing to reuse in the schema yet.** `apps/api/prisma/schema.prisma` declares only `User`,
  `PasskeyCredential`, `AuthSession`, `AuthChallenge`, `EmailActionToken`,
  `PhoneVerificationChallenge`. There is **no** offer, exchange, or money model, and no
  `Decimal`/`numeric` column. Every timestamp is `@db.Timestamptz(6)` (e.g. `schema.prisma:30,35`),
  and the migration uses `TIMESTAMPTZ(6)` (`.../migration.sql:9,14`). `docs/audit/t00-baseline.md:214`
  confirms offers/exchanges are unimplemented.
- **Test harness.** `docs/testing/e2e.md`: API scenarios live in `apps/api/test/<area>.e2e-spec.ts`,
  mobile flows in `apps/mobile/e2e/`; day-boundary and status fixtures are testable at the API
  contract level.

### Assumed (not verified)

- The concrete status names of the exchange state machine. SP04 is a parallel spike; this report
  uses the labels the backlog already states — `confirmed_by_both`, completed, mutually cancelled,
  incident — and treats any additional states as SP04's to name.
- That a `Decimal` (Prisma `numeric`) column is the intended representation; `AGENTS.md:45` allows
  either decimal or integer minor units, and the choice is a schema decision (see §5).
- That Zelle and USD cash are distinct display buckets. They are different rails carrying the same
  currency; whether the product merges them is a product-owner decision (§5), and this report does
  not assert either way.
- The margin's unit (absolute amount, percentage, or rate spread). SP02 owns it.

### External sources

- Venezuelan Standard Time (VET / IANA `America/Caracas`) is UTC−4, year-round, no DST, since
  1 May 2016 — <https://www.timeanddate.com/time/zones/vet> and
  <https://www.timezone.io/iana/America/Caracas>. This is the only time zone in Venezuela and
  therefore the candidate for the Ciudad Ojeda market; the boundary itself is a product decision
  (§5).

## 3. Options considered

### A. What the history lists

1. **Exchanges the seller is a party to** (offers' agreed/completed/cancelled/incident records).
   *Pros:* matches F01 ("from immutable transaction records"); one clear source; no fabricated
   rows. *Cons:* sellers may also want to see offer activity. **Kept.**
2. **Exchanges plus offer-lifecycle events** (published, paused, depleted). *Pros:* richer.
   *Cons:* mixes two record types and two capabilities; F01 scopes "transaction history." **Rejected
   for MVP**; revisit if sellers ask.
3. **All platform activity touching the seller.** *Cons:* undefined surface, privacy risk.
   **Rejected.**

### B. What "daily earnings" means

1. **Reported activity only** — per asset: completed-transaction count and total agreed volume,
   labelled as *self-reported*, never "profit." *Pros:* consistent with "no custody, settlement
   proof, or seller cost basis" (`/tmp/backlog2.md:95`) and T13's "does not verify that the exchange
   occurred." **Kept as the floor.**
2. **Reported activity plus the seller's self-declared margin**, shown as a separate, clearly
   labelled *expected margin (self-declared, unverified)* figure. *Pros:* the margin field is a fixed
   requirement already displayed on the offer (`/tmp/backlog2.md:44,180`); surfacing its sum is the
   natural reading of "earnings derived from … the seller's own margin." *Cons:* without a cost basis
   it can still be read as profit. **Kept conditionally — the display of margin as earnings is the
   product owner's decision (§5).**
3. **Profit.** *Cons:* explicitly forbidden — no cost basis, no settlement proof. **Rejected.**

### C. Day boundary and timezone

1. **Market-local civil day** in an explicit IANA zone stored per market (candidate
   `America/Caracas`, UTC−4). Boundary at local 00:00. *Pros:* "daily" matches the seller's day;
   Venezuela has one zone with no DST, so it is stable; storing the zone (not the offset) is
   future-proof if a market ever spans zones. **Kept.**
2. **UTC calendar day.** *Pros:* trivial. *Cons:* 00:00 UTC is 20:00 the previous day in Ciudad
   Ojeda, so a seller's "today" would end at 8 p.m. **Rejected.**
3. **Device-local day.** *Cons:* two sellers in the same market could disagree, and the server could
   not reproduce the summary. **Rejected.**
4. **Rolling 24 h.** *Cons:* not a "day"; harder to reconcile with fixtures. **Rejected.**

### D. Currency and asset grouping

1. **Per-asset buckets, no cross-asset total** — one line each for the asset/rail actually
   exchanged. *Pros:* satisfies "do not combine currencies without an approved conversion source and
   timestamp" (`/tmp/backlog2.md:96`). **Kept.**
2. **Combine into a single number via a conversion rate.** *Cons:* needs an approved rate source and
   timestamp that do not exist yet; SP02 owns reference rates. **Rejected until approved.**

### E. Statuses in the summary

- **Counted:** completed (both parties confirmed). Pending (`confirmed_by_both`, not complete),
  cancelled, and disputed/incident contribute **0** to totals but remain visible as rows.
  *Rationale:* T13 makes completion bilateral and treats disagreement as an incident, so only
  completion is a defensible "activity" event. **Kept.**
- **Count everything as soon as it is agreed.** *Cons:* contradicts T13's distinction between
  confirmed and completed. **Rejected.**

### F. Retention

- **Retain the immutable record and its events; minimize personal data** (display name + public
  identifiers only; no contact or precise location), with a retention period owned by the product
  owner/legal. **Kept** (see §5 for the period).

## 4. Recommendation

**History.** A seller-only, paginated, cursor-ordered list of the exchanges they are a party to,
read from the immutable snapshot plus its status events. Each row shows: direction/pair; the assets
given and received; the agreed amount and rate; the seller's declared margin (subject to §5); the
current status; the relevant timestamps (agreed, completed/cancelled/incident); the market; and the
counterparty's **public** display name only. Filters: status, date range (in the market zone), asset
pair, and direction. Ordering is stable (e.g. by agreement time, then id) and page size is capped.

**Statuses shown.** Pending → "reserved / in progress", contributes 0. Completed → contributes to
the summary. Mutually cancelled → shown with its timestamp, contributes 0, reservation released.
Disputed/incident → flagged, excluded from totals until resolved; a completion disagreement is an
incident, never a completion (T13).

**Daily summary.** Per asset bucket, for completed exchanges only, on the market-local civil day:
completed count, total agreed volume, and — only if the product owner approves — the self-declared
expected margin, labelled as unverified and never as profit or verified earnings. No cross-asset
total. The label states the platform does not custody, settle, or verify the exchange.

**Money.** Store and compute in exact decimal (Prisma `Decimal`/`numeric` with explicit scale, or
integer minor units), never binary floating point (`AGENTS.md:45`); serialize to the client as
strings/minor units, and render with the design system's tabular figures
(`design-system/spec.md:60–63`). The platform's zero per-exchange commission means **no platform-fee
line** appears in any per-exchange figure; subscription charges belong to billing (T08), not here.

**Timezone.** Derive "daily" from the market's stored IANA zone (candidate `America/Caracas`,
UTC−4, no DST); persist all instants as `timestamptz` and compute the local day at read time.

**Never shown.** The counterparty's email/phone/private contact and precise location or home
address; internal identifiers or trust/risk metadata; the counterparty's margin or cost basis; any
custody/escrow/settlement status; any "profit"/"verified earnings" claim; and any combined-currency
total without an approved conversion source and timestamp. Sellers can read only their own history
(`AGENTS.md:72`; F01 acceptance).

## 5. Unresolved decisions

| Decision | Owner |
| --- | --- |
| Whether the seller's own margin is displayed as "earnings", and under what label | **Product owner** |
| Any reporting threshold (e.g. minimum completed count/amount before a summary shows) | **Product owner** |
| Margin semantics: absolute amount, percentage, or rate spread; scale and rounding | **SP02 / Product owner** |
| Exact exchange status enum and how a disputed/incident state is represented | **SP04 / Product owner** |
| Timezone and day boundary confirmation (recommend `America/Caracas`, local 00:00) | **Product owner + backend** |
| Whether USD cash and Zelle (both USD) share one bucket or stay separate | **Product owner** |
| Conversion source + timestamp if any cross-currency total is ever approved | **Product owner (with SP02)** |
| Retention period and anonymization rule for exchange history and incidents | **Product owner + legal** |
| Which counterparty identity fields are shown (public display name only?) | **Product owner / trust & safety** |
| Decimal column vs integer minor unit for money in the schema | **Backend (T02/T03)** |

## 6. Product and technical impact

- **New module** (e.g. `exchanges`/`earnings`) in `apps/api/src/`, following hexagonal layering
  (`config.yaml:15–19`): domain models for the exchange snapshot and events; application use cases
  for history and daily summary with the ports they need; inbound HTTP controller + DTOs; outbound
  Prisma repository. Controllers stay thin; no business rules in the mobile component body
  (`AGENTS.md:82–88`).
- **Schema/migration.** New exchange/event tables with an immutable terms snapshot, statuses,
  timestamps (`timestamptz`), market reference, and a money column (`numeric`/minor unit) plus a
  `CHECK` constraint for the status set — hand-written SQL inside a `--create-only` migration
  (`AGENTS.md:39`). Index the history query (`seller_id`, agreement time) and the summary query
  (`seller_id`, status, completed-at).
- **API.** Seller-scoped, paginated history and a daily-summary endpoint; authorization checked per
  operation; money serialized exactly; the summary is computed server-side so day boundaries and
  totals are reproducible.
- **Mobile.** Two screens (history list, daily summary) using RTK Query (one `createApi` slice) with
  gluestack components; loading/error/empty states; a non-custody notice in the amber role; tabular
  figures for amounts and rates; the summary refreshes when an exchange changes state.
- **Analytics.** SP10's event dictionary should include the exchange state transitions so the
  summary is derivable from the same events.
- **Testing.** API e2e scenarios for seller-only access, pagination, status inclusion, day-boundary
  fixtures, and mixed-asset days; mobile flows for the two screens (`docs/testing/e2e.md`).

## 7. Testable scenarios

1. **WHEN** seller A requests their history **THEN** only exchanges where A is a party are returned;
   seller B's records are never visible, even with B's exchange id.
2. **WHEN** an exchange is `confirmed_by_both` but not completed **THEN** it appears in the history
   as reserved/in progress and adds nothing to the daily totals.
3. **WHEN** both parties confirm completion **THEN** the exchange appears as completed and its
   agreed volume is added to that asset's bucket on its completion day.
4. **WHEN** an exchange is mutually cancelled **THEN** it appears with its cancellation timestamp,
   adds nothing to totals, and the reserved amount returns to offer availability.
5. **WHEN** the parties disagree about completion **THEN** the exchange is recorded as an incident,
   not a completion, and is excluded from the totals.
6. **WHEN** a seller completes exchanges in USD cash, USDT, and VES on the same day **THEN** the
   summary shows three separate per-asset lines and no combined total.
7. **WHEN** two completions fall on either side of local midnight in `America/Caracas` **THEN** they
   land on different days; the same instants near 00:00 UTC do not.
8. **WHEN** the margin is displayed **THEN** it is labelled self-declared/unverified and never as
   profit or verified earnings; when the product owner has not approved it, no margin figure appears.
9. **WHEN** any history row is rendered **THEN** it shows no counterparty email/phone, no precise
   location or home address, and no custody/escrow/settlement status.
10. **WHEN** the summary is computed for a mixed-asset day **THEN** every amount is an exact decimal
    and matches the fixture to the defined scale, with no floating-point drift.
11. **WHEN** a seller has no exchanges **THEN** the history and summary show an empty state, not an
    error.

## 8. Sources reviewed

- `AGENTS.md` (all sections; especially Product context, PostgreSQL/PostGIS, Node/NestJS, React).
- `/tmp/backlog2.md` — SP02, SP04, SP10, SP11, T09, T13, F01, and the execution/E2E rules.
- `README.md` — problem, business model, MVP scope, implementation status.
- `docs/architecture.md` — responsibility boundaries and current status.
- `docs/flows/search-and-contact.md`, `docs/flows/seller-offer-lifecycle.md`,
  `docs/flows/authentication.md`.
- `docs/testing/e2e.md` — entry points, isolation, scenario conventions.
- `docs/audit/t00-baseline.md` — verified state of the repository.
- `openspec/config.yaml`, `openspec/specs/testing/e2e-foundation/spec.md`,
  `openspec/specs/mobile/app-shell/spec.md`, `openspec/specs/mobile/design-system/spec.md`.
- `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/migrations/20261015150121_init_identity_schema/migration.sql`.
- `docs/spikes/README.md` — the spike protocol.
- External: <https://www.timeanddate.com/time/zones/vet>,
  <https://www.timezone.io/iana/America/Caracas>.
