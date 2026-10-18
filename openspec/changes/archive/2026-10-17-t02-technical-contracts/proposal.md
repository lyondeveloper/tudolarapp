# Proposal

## Why

T01 answered the product register (`openspec/changes/t01-product-decisions/design.md:28-126`) and
every downstream task now waits for T02. The backlog's dependency graph is explicit: T03 (Prisma and
the data foundation) and T15 (mobile shell) wait for T02, and T04–T14 wait for T03. The technical
contracts, however, do not exist yet:

- **The API has no contract at all.** There is no versioning scheme; no single error envelope — auth
  answers with `{ statusCode, message }` from `auth-application-error.filter.ts:64-66` while
  `ValidationPipe` answers with Nest's own shape from `app.module.ts:21-29`; no pagination
  convention; and no way for the active market to travel with a request. `AGENTS.md:9` makes market
  scope mandatory on every operation, but nothing in the API carries it.
- **The offer/quote and immutable terms-version contract has four names and no owner.** SP02's
  `Offer`/`OfferVersion`/`Quote`/`TermsSnapshot`, SP04's `agreement_terms_version`, and SP09's
  `offer_terms_versions` describe the same object (`docs/spikes/CROSS-C-commercial-trust.md:150-157`,
  mismatch IM4). ADR-0001 fixed the parent (the offer) but not the field list, and the product owner
  assigned the quote and immutable terms-version contract to T02
  (`docs/spikes/SYNTHESIS.md:148`). T09 and T13 both consume it.
- **The single migration authority is not true today.** `AGENTS.md:39` requires Prisma to own the
  schema and the migrations, but `CREATE EXTENSION postgis` is not in `apps/api/prisma/migrations`;
  it lives in `docker/initdb/01-create-databases.sql:7,11` and
  `apps/api/test/provision-e2e-database.cjs:46`, and the `schema.prisma` header wrongly claims it is
  appended to the migration (`apps/api/prisma/schema.prisma:8-11`). SP09 found the same defect from
  the code (`docs/spikes/SP09-technical-feasibility-test-architecture.md:62-79`; audit finding F-4).

Without T02 each module invents its own error shape, pagination, market context, and terms version —
the exact "two agents build two different things from the same evidence" failure the spike
cross-checks were written to prevent (`docs/spikes/CROSS-C-commercial-trust.md:107-157`).

## What Changes

- **Records the stack decisions as ADRs `0019`–`0025`** under `docs/adr/`: Prisma ORM and Prisma
  Migrate as the sole schema and migration authority; hexagonal architecture in the NestJS API; RTK
  Query as the sole remote-state layer; gluestack as the design system; PostGIS with the
  `Unsupported("geometry")` mapping; the React Native + Expo mobile client; and the API module
  boundaries. Several are already stated in `AGENTS.md`; the ADR records the decision and its
  rationale and cites `AGENTS.md` rather than restating it as a new rule.
- **Reconciles the migration history.** A `--create-only` migration adds
  `CREATE EXTENSION IF NOT EXISTS postgis` to the single authority under a privileged migration role,
  and a startup assertion fails loudly when the extension is absent — SP09's recommendation
  (`docs/spikes/SP09-technical-feasibility-test-architecture.md:190-195`).
- **Freezes the API contract:** URI versioning, one error envelope with a closed code enum, cursor
  pagination, and a market-context header the server validates on every operation.
- **Defines the initial DTOs/contracts** for markets, seller profiles, subscriptions/entitlements,
  offers, search, conversations, exchanges, and reports.
- **Defines the quote and immutable terms-version contract** (the addition): an offer edit inserts a
  new version and never changes numbers both parties already confirmed; T09 and T13 both consume it.
- **States the safe-PostGIS-query rule:** parameterized SQL only, never interpolated, with the market
  predicate co-located with the proximity predicate in the same `WHERE`.

## Capabilities

### New Capabilities

None. This change records decisions and freezes contracts rather than changing behavior, so it
declares `skip_specs: true` in `.openspec.yaml`. The contracts become the specs the consuming tasks
write.

### Modified Capabilities

None.

## Impact

- `docs/adr/` — ADRs `0019`–`0025`, plus the `README.md` index.
- `openspec/changes/t02-technical-contracts/design.md` — the frozen contract set.
- `apps/api/src/` — the contract layer: `common/` (error envelope, pagination, versioning,
  market context), `catalog/` (pair/rail/asset and money value objects), and the initial DTOs and
  ports under each module (`markets`, `sellers`, `subscriptions`, `offers`, `search`,
  `conversations`, `exchanges`, `reports`).
- `apps/api/prisma/migrations/` — one `--create-only` migration enabling PostGIS, and the corrected
  `schema.prisma` header comment.
- `apps/mobile/src/services/api.ts` — the base URL gains the version prefix.
- No new dependency, and no framework decision is reopened.

### Out of scope

- **Group I** (pilot thresholds, supply minimums, the deferral list, and whether an analytics SDK is
  ever added) and **group G** (the legal review) stay open; where a contract touches them it names
  them as open rather than deciding them (`openspec/changes/t01-product-decisions/design.md:112-116`).
- **Implementing the feature behavior** — offer publish, search results, conversations, agreements,
  and reports are built by their own tasks (T08–T14); T02 freezes the contract they build on.
- **The natural-language parser.** The port is defined and left unimplemented, per ADR-0015.
- **Subscriptions and billing.** Deferred per ADR-0014; only the entitlement port contract is frozen.
- **Reopening the agreed stack** or adding a dependency by convention.

### Source

Notion T02 — Approve Technical Decisions and API Contracts —
https://app.notion.com/p/d358155c-3492-4735-81e0-c058e08e3b36
