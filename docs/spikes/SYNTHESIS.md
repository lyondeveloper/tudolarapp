# Discovery spike synthesis — SP01–SP12

Prepared for the product owner's review, which the backlog requires **before T01 is approved**. This
is an index and a reconciliation, not a replacement: each spike's own report holds the evidence,
options, and scenarios.

## The set

| Spike | Report | Recommendation in one line |
| --- | --- | --- |
| SP01 | `SP01-exchange-pairs.md` | Normalize each leg as `(asset, rail, delivery)` and each pair as an ordered `(give, receive)` from the closed ten-pair catalog; Zelle is a **USD rail**, not an asset |
| SP02 | `SP02-pricing-quotes-limits.md` | Versioned offer + immutable server-computed quote + shared terms snapshot; money in exact minor units, rounded once server-side |
| SP03 | `SP03-offer-inventory-allocation.md` | Immutable `initial_amount` with guarded counters; reserve atomically at the second confirmation via compare-and-swap; hide at zero, restore on mutual cancel |
| SP04 | `SP04-agreement-cancellation-incidents.md` | Versioned terms snapshot, derived `confirmed_by_both`, bilateral completion, two-step mutual cancellation, separate incident entity; **no** single-party cancel after confirmation |
| SP05 | `SP05-market-geofences-location-privacy.md` | Market as a PostGIS polygon (SRID 4326); `ST_Covers` + `market_id` as a **mandatory** predicate in every offer query; GPS narrows, never expands |
| SP06 | `SP06-prompt-to-search-contract.md` | Closed allowlisted criteria schema with no price/market/SQL/sort fields, behind a parser port; backend re-validates and runs the same deterministic search |
| SP07 | `SP07-seller-eligibility-trust-safety.md` | Eligibility as its own state enforced at publish; minimal private-by-construction public profile; one support workflow for report/block/no-show/moderation/appeal |
| SP08 | `SP08-subscription-compliance-launch.md` | Provider-neutral subscription port; entitlement derived server-side and failing closed; webhook-only payment facts, deduped; zero per-exchange commission |
| SP09 | `SP09-technical-feasibility-test-architecture.md` | Reuse the codebase's existing compare-and-swap idiom for reservations and idempotency; push invariants into PostgreSQL; one migration authority |
| SP10 | `SP10-mvp-scope-pilot-metrics.md` | One market, thinnest observable funnel; server-derived event dictionary; defer NL search, ratings, self-serve billing, replenishment, passkeys |
| SP11 | `SP11-seller-transaction-history-earnings.md` | Seller-only paginated history from the immutable snapshot; per-asset daily summary of **completed** exchanges on the market-local civil day; exact decimals |
| SP12 | `SP12-llm-natural-language-search.md` | Rules-first deterministic parser with a schema-constrained hosted LLM only for the residual text, behind one port |

## What twelve independent reports converged on

Independent agreement is the strongest signal in this set, so it is worth separating from any single
report's opinion:

- **The backend owns money, ranking, and market scope.** SP06 and SP12 independently bound the model
  to parsing typed criteria only; SP02 and SP11 independently require exact decimals and a single
  server-side rounding step. No spike proposes letting the client or the model compute a price.
- **Atomicity reuses what already exists.** SP03, SP04, and SP09 independently arrive at
  single-statement compare-and-swap inside a short transaction, and SP09 anchors it to the existing
  `rotateSession` and `consumeAuthChallenge` implementations rather than inventing a pattern.
- **Immutability plus versioning protects confirmed terms.** SP02, SP04, and SP09 independently
  require an immutable, referenced terms version, and SP04 makes the forbidden transition explicit:
  nothing lets one party cancel after `confirmed_by_both`.
- **Market scope is a predicate, not a filter.** SP05 and SP09 independently require the market
  predicate to sit with the proximity predicate so no query can return an out-of-market offer.
- **Nothing may imply custody, escrow, or settlement.** SP04, SP08, and SP11 each restate this
  independently, and SP11 refuses a "verified earnings" label on that basis.
- **External providers stay behind ports with test adapters.** SP08 mirrors the existing
  `EmailDeliveryPort`/`SmsDeliveryPort` pattern and forbids simulating a successful payment.

## Contradiction confirmed independently

**SP09 found, from the code, the same defect T00 recorded as F-4.** `schema.prisma` (its header
comment) and `AGENTS.md` both state that `CREATE EXTENSION postgis` is hand-appended to the generated
migration SQL. It is not: the extension is installed by `docker/initdb/01-create-databases.sql` and,
since the E2E foundation, by `test/provision-e2e-database.cjs`. Two independent investigations — one
from documentation and one from code — now agree the comment is wrong, and SP09 notes the practical
consequence: a database created without the init script has no PostGIS, and a future `migrate dev`
cannot add it.

SP09 recommends one authority (`prisma/migrations`) plus a startup assertion. This is a concrete,
cheap fix and a good first candidate for T02/T03.

## A coordination flaw in this batch, and what it means

The spikes ran **in parallel and did not read each other**. SP10 states this outright, SP09 believed
no sibling reports existed, and SP06 caught a sibling agent claiming to have read an SP12 report that
had not been written yet — SP06 correctly refused to use it.

Two consequences you should weigh before approving:

1. **The set is not internally cross-checked.** Where two spikes cover adjacent ground they agree
   (see above), but nobody verified their interfaces against each other.
2. **The `U1…Un` identifiers collide.** Every spike numbered its own open decisions from U1, so
   `U1` means something different in each report and must not be quoted across reports. The table
   below re-keys them by decision, not by spike-local id.

A short synthesis pass over the interfaces — inventory ↔ agreement ↔ earnings, and search ↔ geofence
↔ parser — would close this cheaply before T01. It is the one gap this batch leaves.

## Product-owner decision register

The canonical answered and open register is maintained in
`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md`; its accepted decisions are recorded in
`docs/adr/0009`–`0018`. This synthesis is evidence, not a second decision list. Group G remains
legal-review input rather than clearance, and group I remains undecided for the pilot; neither
blocks the MVP build.

## Verification limits to be honest about

- **SP05 could not re-fetch the Expo SDK 57 `expo-location` page** (web fetch denied in its session),
  so that API surface is cited from SDK 54 docs and flagged in its report for re-verification.
- **SP12's cost and latency figures are point-in-time**, cited and marked for re-verification at
  implementation.
- **No spike ran shell commands** (denied in background sessions), so none verified its own file
  mechanically; the parent agent verified all twelve centrally: every report has the eight protocol
  sections, and only `docs/spikes/` was written.

## Avoiding counter drift

Stored counters duplicate a number that the agreement rows already imply, so they can disagree. Four
defences, in order of strength — the first three are cheap and should all be used:

1. **One writer, same transaction.** The counters are mutated *only* inside the transaction that
   changes the agreement, with the compare-and-swap guard. This makes drift impossible on every path
   the application can take, which is the real fix; the others catch mistakes in that discipline.
2. **Database CHECK constraints** — `reserved_amount >= 0`, `completed_amount >= 0`, and
   `reserved_amount + completed_amount <= initial_amount`. These catch arithmetic corruption and
   oversell, and they are the same class of hand-written object the schema already carries.
3. **An asserted reconciliation.** A test (and ideally a startup or scheduled check) asserting
   `reserved_amount = SUM(agreements in a reserved state)` and the same for `completed`. This is the
   only defence that detects *disagreement* rather than corruption, and it belongs in the integration
   layer SP09 asks for.
4. **A database trigger** maintaining the counters on agreement insert/update would make the
   database itself the guarantor, but it hides logic, is unmodelled by Prisma, and needs the same
   hand-written-SQL care as CHECKs. Recorded as an option, not the recommendation.

ADR-0026 retains `completed_amount` as a stored counter and records the atomic port, CHECK constraints,
and reconciliation that T03 must implement.

## Cross-checks

The spikes ran in parallel and never read each other, so three cross-checks were run over the
clusters: `CROSS-A-transaction-lifecycle.md`, `CROSS-B-discovery.md`, and
`CROSS-C-commercial-trust.md`. Each found real interface problems the individual reports could not
see.

| Cross-check | Most important finding |
| --- | --- |
| **A — transaction lifecycle** | **Resolved.** The immutable terms version had two incompatible parents — SP04 scoped it to the agreement, SP09 to the offer — and **ADR-0001** puts it on the offer, because T13 requires the record to capture the offer's terms version. SP11's invented status labels ("mutually cancelled", "disputed") are superseded by **ADR-0004**, which adopts SP04's enum (`awaiting_confirmation`, `confirmed_by_both`, `completed`, `cancelled`, `incident_open`, `expired`). |
| **B — discovery** | **Resolved.** SP06 made a location *required* when GPS is unavailable, contradicting SP05, SP12, the backlog and its own test case; **ADR-0002** makes location optional and searches the whole active market. SP12's stale field names and its missing "cannot parse" outcome are settled by **ADR-0003**, which puts the closed schema on SP06. |
| **C — commercial and trust** | **Resolved.** See ADR-0006, ADR-0008, and ADR-0009; the T01 register points to the current product decisions, and the ADRs record the reconciled contracts. |

## Next step

Product decisions and their remaining open questions are in the T01 change and ADRs 0009–0018;
technical contracts are in T02 and ADRs 0019–0026. The spike and cross-check reports remain evidence,
not a second source of current decisions.

T01 waits for the complete set, which is now in hand.
