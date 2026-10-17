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

## Open decisions for the product owner

Grouped by what they block, with the consuming task. No spike decided any of these.

**Blocking T04 (markets) — highest priority, nothing geospatial can start without it**

- The official polygon or source defining the Ciudad Ojeda market. Raised independently by SP05,
  SP06, and SP10.

**Product scope**

- Whether seller profiles and subscription billing are global or market-specific (SP05, SP07, SP10).
- The pair/rail normalization calls: the rail of the unqualified "VES" leg; whether fully digital
  pairs require an in-person meeting; canonical pair labels (SP01).
- Replenishment: allowed at all, and if so under which model (SP03).
- Which reputation signals ship, and whether sellers need identity/KYC beyond contact verification
  (SP07).
- Blocking semantics, moderation roles, evidence retention, appeal and response SLAs (SP07).
- Contact verification required to publish: email, phone, both, or none — noting both delivery
  providers are unconfigured today (SP07, SP08).
- Final deferral list, pilot success/stop thresholds, minimum supply, seed size, and whether a client
  analytics SDK is added at all (SP10).
- The day boundary and timezone for "daily earnings", and whether the seller's own margin is shown as
  earnings and under what label (SP11).

**Commercial**

- Reference-rate source(s) and reference time; how the seller margin is expressed and bounded; and
  whether the same-currency VES bank → VES cash pair carries a rate or margin at all (SP01, SP02).
- Quote validity and refresh, rounding scale and mode, min/max rules and bounds, default offer
  duration and cap (SP02).
- Subscription plans and prices, the charging provider, expiry and grace policy, refunds, and whether
  app-store billing is mandatory (SP08).

**Legal and compliance — SP08 found evidence, not conclusions**

- Zelle's terms restrict it to personal, non-commercial use; Venezuela's exchange-control regime was
  derogated in 2018 but OFAC 31 CFR 591 applies; app stores require their own billing for
  feature-unlocking subscriptions. These need a jurisdictional review before launch, not a spike's
  judgement.

**Technical, for T02 rather than you**

- Whether an unconfirmed agreement expires, and whether a reservation is held or released during
  reconfirmation (SP04).
- Whether a single-party incident report releases the reservation, or only mutual cancellation or
  moderation (SP04) — the backlog fixes mutual cancellation but is silent on withdrawal alone.
- Reservation time limit; UX when a confirmation loses the atomic guard (SP03).
- The `Unsupported("geometry")` mapping, SRID choice, and PostGIS provisioning authority (SP05, SP09).
- Integration-test file convention, and the auth requirement for parsing free text (SP06, SP09).
- LLM provider and model, PII handling for free text, and the cost budget at pilot scale (SP12).

## Verification limits to be honest about

- **SP05 could not re-fetch the Expo SDK 57 `expo-location` page** (web fetch denied in its session),
  so that API surface is cited from SDK 54 docs and flagged in its report for re-verification.
- **SP12's cost and latency figures are point-in-time**, cited and marked for re-verification at
  implementation.
- **No spike ran shell commands** (denied in background sessions), so none verified its own file
  mechanically; the parent agent verified all twelve centrally: every report has the eight protocol
  sections, and only `docs/spikes/` was written.

## Next step

You review this set. The accepted decisions then go into the **T01** (product decisions) and **T02**
(technical decisions and contracts) OpenSpec changes, which is where durable decisions live — these
reports are evidence for that review, not requirements the system must satisfy.

T01 waits for the complete set, which is now in hand.
