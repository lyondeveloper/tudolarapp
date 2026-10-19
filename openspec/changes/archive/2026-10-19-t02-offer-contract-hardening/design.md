# Design

## Context

See `proposal.md` for motivation and `specs/offers/terms-and-inventory/spec.md` for behavior.
This follow-up is scoped to the open PR #6 head (`3341fca`) and should remain on that PR branch.
The PR has no offer or exchange HTTP routes and no concrete offer repository; this change completes
the contracts and domain/persistence invariants before T09/T13 add those adapters and flows.

`PairId` defines the ordered give/receive assets, while `Money` carries an exact amount and asset.
`offer_terms_versions` stores numeric values without repeating their assets, so domain validation
must bind each amount to its pair before persistence. The offer's immutable pair fixes the unit of
its inventory counters.

## Goals / Non-Goals

**Goals:**

- Keep offer terms and give-asset inventory units consistent at the domain boundary.
- Make publish and offer-view contracts complete enough that T09/T10 do not infer missing terms.
- Give offers and exchanges an application-level transaction seam without importing Prisma into
  application or domain code.
- Add PostgreSQL constraints for invariants that can be checked from persisted terms columns.
- Exercise the migration's invalid-existing-row preflight and prevent the runtime role from bypassing
  terms immutability with administrative privileges.
- Keep the archived T02 design, ADRs, and repository instructions consistent with the PR.

**Non-Goals:**

- Adding the offers table or its inventory counters; T03 owns that migration and its foreign key.
- Implementing offer publication, search, or agreement HTTP endpoints and concrete T09/T10/T13
  repositories.
- Changing the product's catalog, quote rounding, legal/pilot decisions, or no-custody model.
- Fixing mobile/auth, HTTP perimeter, local E2E credentials/ports, or unrelated documentation from
  the wider audit.
- Provisioning production secrets or production database roles; infrastructure owns those values,
  while this change defines the connection contract and local/E2E setup.

## Decisions

### Domain validation owns terms coherence

Add a pure validator and initial-terms builder under `apps/api/src/offers/domain/`. Call the
validator from material edits and the builder. Resolve `pairId` through the shared catalog; do not
redeclare pair members or infer assets from currency names.

- An offer's `pairId` is fixed after publication. A seller who needs a different pair creates a
  different offer because inventory counters remain in the original give-asset unit.
- `giveAmount` uses the pair's give asset; `receiveAmount` uses its receive asset. `minAmount` and
  `maxAmount` both use the give asset.
- Give, receive, minimum, and maximum amounts are positive, and minimum does not exceed maximum.
  Reject values that cannot fit the existing `NUMERIC(24, 6)` columns instead of deferring failure
  to PostgreSQL.
- `VES_BANK_TO_VES_CASH` has no rate. Conversion pairs require a positive rate using ADR-0008's
  receive-units-per-give-unit convention. Keep the existing rate scale and margin bound.
- A pure initial-terms builder defaults an omitted publish expiry to seven days. A supplied or
  edited expiry must be in the future and no more than thirty days after the operation's injected
  clock.

Keep these rules in `offers/domain/`; use catalog pair resolution and exact `Money` operations, not
floating-point arithmetic.

**Alternative:** Allow pair changes while retaining inventory counters. Rejected because that
would reinterpret the immutable counter values in a different give-asset unit.

### Publish and offer-view contracts carry complete terms

Expand `PublishOfferRequest` in `offers/application/` to include seller and validated market
context, pair, description/details, initial inventory amount, per-transaction give/receive amounts,
rate, margin, limits, and optional expiry. The initial inventory amount is a separate `Money`
value in the pair's give-asset unit. The inbound
adapter obtains seller identity from the authenticated principal and market scope from the
validated market context, not from client authorization claims. The application flow passes the
request to the pure initial-terms builder, which applies ADR-0010's seven-day default.

The offer DTO exposes current terms as a nested read model, including the terms-version id and the
values needed to inspect an offer. The mapper assembles the offer and its current version; it does
not duplicate terms or calculate rates. This PR changes the contract only and adds no route.

### Transaction context remains an application contract

Define an opaque `TransactionContext` and `TransactionRunnerPort` under
`apps/api/src/common/application/`; application/domain types must not expose `Prisma.TransactionClient`.
The concrete Prisma adapter belongs under `apps/api/src/database/adapters/out/` when the consuming
flows are implemented.

Offer write ports accept a shared context for offer creation, version append/current-pointer
movement, and reserve/release/complete operations. The exchanges transition port accepts that
same context. Guarded release/completion return an explicit outcome so the caller cannot persist an
agreement transition after an underflow failure. The actual agreement/inventory atomicity scenario
belongs to T13's E2E flow; this change freezes the contract it must use.

**Alternative:** Let repositories create independent transactions or use an ambient Prisma client.
Rejected because independent transactions cannot provide atomic agreement/counter updates and an
ambient concrete client leaks infrastructure into application contracts.

### Database constraints complement the domain

Add a new Prisma migration; do not edit the recorded terms-version migration or create a second
table. Add checks for the closed pair catalog, `version >= 1`, positive amounts, `min_amount <=
max_amount`, `0 <= margin_pct < 100`, positive conversion rates, and the pair/rate nullability rule.
Preserve the existing unique `(offer_id, version)` index and update/delete triggers. `offer_id`
remains a scalar UUID until T03 creates `offers` and its relation.

Preflight existing terms rows and stop with a clear report if any violate the new checks. Verify
checks through `pg_constraint`, because Prisma does not model or introspect them. E2E tests use
direct SQL to prove invalid rows are rejected, and exercise both UPDATE and DELETE triggers.

The update/delete triggers do not protect against a privileged `TRUNCATE`; the runtime-role decision
below prevents the API from having that privilege. E2E reset continues through a separate
maintenance connection.

### Migration preflight is exercised against existing data

Add `apps/api/test/e2e/offer-terms-version-preflight.cjs` as an integration test. It creates an
isolated scratch database, applies the existing `offer_terms_versions` table migration, inserts one
invalid historical row, and runs the checks migration. Assert the preflight fails with the
offending row id, the row remains unchanged, and the new checks were not installed. The test owns
only its uniquely named local `_test` database and drops only that database during teardown.
`npm run test:e2e:preflight` runs it directly, and `run-e2e.cjs` runs it before the normal suite.

**Alternative:** Test only invalid inserts after the checks have been installed. Rejected because
that would not exercise the migration path that must protect existing data.

### Runtime and maintenance database roles are separate

`DATABASE_URL` is the non-administrative application connection. It is not a superuser or owner and
has no schema DDL or `TRUNCATE` privileges; grant only the DML privileges required by the API.
`MIGRATION_DATABASE_URL` is reserved for Prisma migrations and E2E database provisioning/reset.
`PrismaService` continues to read only `DATABASE_URL`; Prisma CLI configuration reads the migration
URL when supplied. Local migration credentials live in a separate ignored `.env.migration` file or
are exported only for migration/test commands; neither the API's `.env` nor its runtime process
receives them.

The E2E resolver derives matching runtime and maintenance URLs for each worktree database.
Provisioning, migrations, reset, and teardown use the maintenance URL; seed and API/Jest execution
use the runtime URL. The runner removes the maintenance URL from the environment of the API
process. `docker/initdb` creates a local non-superuser app role and grants only the required table
and sequence DML privileges; the E2E provisioner creates/verifies the role and applies those grants
for existing local volumes and disposable databases as needed.

**Alternative:** Add a statement-level `TRUNCATE` trigger. Rejected because it does not address the
application's broader superuser/DDL privileges and would complicate the intentional E2E reset path.

### Agreement references are offer-scoped

`resolveAgreementTerms` verifies both `termsVersionId` and `offerId`. A version found by id but
owned by another offer is an invalid reference and returns a controlled consistency error. Keep
this helper in `offers/domain/`.

### PR documentation remains navigable

Update links to the archived T02 technical-contracts and contract-gaps directories in the ADR index
and affected ADRs. Correct the root `AGENTS.md` PostGIS rule to match the existing Prisma migration
authority and the provisioning script. Do not alter T01 or spike references that are still valid in
the PR base branch.

## Risks / Trade-offs

- [Existing terms rows may violate new checks] → run preflight queries and stop deployment until
  the data owner resolves them; never silently delete or coerce terms.
- [T09/T13 may wire transaction calls differently] → freeze the opaque context contract here and
  require T13's full agreement/inventory E2E scenario before that flow is marked complete.
- [The offer DTO contract changes before a route exists] → no deployed route currently consumes it;
  T09/T10 must implement the route and verify the response against this contract.
- [Privileged DDL/TRUNCATE can bypass row triggers] → separate runtime and migration roles in a
  later database-operations change; this PR does not claim protection from administrators.

## Migration Plan

1. Apply this extension on the existing PR #6 branch; keep the recorded table and CHECK-constraint
   migrations unchanged.
2. Create/verify the local app role and run the preflight regression test against its isolated
   scratch database.
3. Apply migrations and E2E reset with the maintenance URL, then run API tests with the runtime URL.
4. Roll back by revoking only the app-role grants introduced by this change. Do not drop the terms
   table, rewrite recorded migrations, or remove its triggers.

## Open Questions

None for the accepted pair-immutability and give-asset min/max decisions. Concrete offer and
agreement endpoints remain T09/T13 work.
