# Tasks

The repository-wide API and mobile E2E gate is a prerequisite for implementation. Before the red
phase, run `npm run test:e2e -- --runInBand` from `apps/api` and `npm run e2e` from `apps/mobile`;
do not proceed if either suite fails.

## 1. Add failing tests and persistence characterization

- [x] 1.1 Add domain unit cases to `apps/api/src/offers/domain/offer-terms-version.spec.ts` for immutable pair identity, terms and inventory asset matching/bounds, positive amounts, give-asset min/max, rate/nullability, expiry defaults/bounds, and numeric-column representability. Run `npm test -- --runInBand --runTestsByPath src/offers/domain/offer-terms-version.spec.ts` from `apps/api`; verify the new behavior assertions fail before implementation.
- [x] 1.2 Add a mismatch case to `apps/api/src/offers/domain/agreement-terms.spec.ts` where `reference.offerId` differs from the version's `offerId`. Run `npm test -- --runInBand --runTestsByPath src/offers/domain/agreement-terms.spec.ts` from `apps/api`; verify resolution currently accepts the mismatch.
- [x] 1.3 Add direct-persistence E2E cases to `apps/api/test/e2e/offer-terms-version-invariants.e2e-spec.ts` for invalid pair, amount, margin, rate, and version rows. Run `npm run test:e2e -- --runInBand test/e2e/offer-terms-version-invariants.e2e-spec.ts` from `apps/api`; verify invalid inserts currently succeed and fail the new assertions.
- [x] 1.4 Add an E2E assertion to the immutability spec for DELETE rejection, and strengthen the generated-delegate checks to use the typed Prisma delegate, assert decimal round-trip, and reject duplicate `(offerId, version)`. Run `npm run test:e2e -- --runInBand test/e2e/offer-terms-version-immutability.e2e-spec.ts` from `apps/api`; the typed delegate, numeric round-trip, unique index, UPDATE trigger, and DELETE trigger assertions pass on PR #6.
- [x] 1.5 Add a focused `apps/api/src/offers/adapters/in/http/offer.dto.spec.ts` for mapping current terms into the offer representation and rejecting offer/version mismatches. Use the TDD red-first typed-shim pattern if the mapper is not exported yet; run `npm test -- --runInBand --runTestsByPath src/offers/adapters/in/http/offer.dto.spec.ts` from `apps/api` and confirm the new assertion fails.
- [x] 1.6 Add a typed-shim unit test in `apps/api/src/offers/domain/offer-terms-version.spec.ts` proving a complete publish input creates version 1 and defaults expiry to seven days. Run `npm test -- --runInBand --runTestsByPath src/offers/domain/offer-terms-version.spec.ts` from `apps/api` and confirm it fails because the initial-terms builder is absent.
- [x] 1.7 Add `apps/api/test/e2e/offer-terms-version-preflight.cjs` to exercise the migration guard in a uniquely named scratch database: apply the existing terms-table migration, insert an invalid pre-existing row, then execute the checks migration and assert it fails with that row id while preserving the row and leaving checks unapplied. Run `npm run test:e2e:preflight` from `apps/api`; the script must drop only the scratch database it created. The expected failure was observed and the row was preserved; this is regression coverage for the already-implemented guard.
- [x] 1.8 Add `apps/api/test/e2e/database-role-privileges.e2e-spec.ts` proving the runtime role is not a superuser, lacks schema DDL and `TRUNCATE` privileges, and cannot truncate terms without losing the row. Run `npm run test:e2e -- --runInBand test/e2e/database-role-privileges.e2e-spec.ts` from `apps/api`; red was confirmed against the superuser URL (`rolsuper`, DDL and `TRUNCATE` were all true) and the transactional TRUNCATE probe rolled back.
- [x] 1.9 Add a unit test to `apps/api/test/worktree-database.spec.ts` proving `resolveTestDatabase` keeps runtime and maintenance credentials distinct while targeting the same worktree database. Run `npm test -- --runInBand --runTestsByPath test/worktree-database.spec.ts` from `apps/api`; the new assertion failed as expected because `migrationUrl` was undefined.

## 2. Implement offer-domain and contract corrections

- [x] 2.1 Implement the pair-aware terms validator, initial-terms builder, and expiry resolution in `apps/api/src/offers/domain/`; pass the unit tests from 1.1 and 1.6 without floating-point comparisons.
- [x] 2.2 Make `resolveAgreementTerms` verify both the version id and offer id; pass the regression test from 1.2.
- [x] 2.3 Complete `PublishOfferRequest` with validated market context, description/details, initial inventory and all per-transaction terms; extend `OfferDto` with the current terms read shape and implement its mapper. Pass the DTO spec from 1.5 and run `npx tsc --noEmit` and `npm run build` from `apps/api`; no HTTP route is added here.
- [x] 2.4 Add an opaque application `TransactionContext` and `TransactionRunnerPort`; pass the same context through offer creation, terms append/pointer updates, inventory mutations, and agreement transitions without importing Prisma into application/domain code. Verify the contract with `npx tsc --noEmit` and `npm run build` from `apps/api`; T09/T13 will test concrete adapters and agreement/inventory atomicity.
- [x] 2.5 Provision a non-superuser runtime role with only required DML privileges and no DDL or `TRUNCATE`; preserve the existing update/delete triggers. Pass the role regression from 1.8 and the focused E2E command from that task.
- [x] 2.6 Separate `DATABASE_URL` runtime connections from `MIGRATION_DATABASE_URL` in Prisma config and E2E helpers. Use the maintenance URL for database creation, migrations, reset, and teardown; use only the runtime URL for seeding, API execution, and in-process E2E tests. Pass the regression from 1.9, run the migration preflight from `run-e2e.cjs`, and verify with `npm run test:e2e -- --runInBand` from `apps/api`.
- [x] 2.7 Add safe local/E2E role provisioning for fresh and existing disposable databases without granting admin privileges to the API role. Verify with `npm run test:e2e -- --runInBand` from `apps/api`.

## 3. Enforce persistence invariants

- [x] 3.1 Add a new Prisma migration for the offer-terms CHECK constraints; do not edit `20261017200000_offer_terms_versions_immutability`. Run `npm run test:e2e -- --runInBand test/e2e/offer-terms-version-invariants.e2e-spec.ts` from `apps/api` and confirm invalid rows are rejected while valid rows persist.
- [x] 3.2 Preflight existing terms rows before applying constraints, add `pg_constraint` assertions to the E2E spec, and verify with `npm run test:e2e -- --runInBand test/e2e/offer-terms-version-invariants.e2e-spec.ts` from `apps/api`.
- [x] 3.3 Generate Prisma Client and run `MIGRATION_DATABASE_URL="$(node -e 'process.stdout.write(require("./test/e2e-environment.cjs").resolveTestDatabase().migrationUrl)')" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` from `apps/api`; confirm no Prisma-model drift and retain the hand-written checks. Result: no difference detected.

## 4. Repair the PR's durable documentation

- [x] 4.1 Amend ADR-0010 with give-asset limit denomination and expiry validation; amend ADR-0026 with immutable pair identity and the transaction-context contract; update `docs/adr/README.md` and verify the index matches.
- [x] 4.2 Replace stale `t02-technical-contracts` and `t02-contract-gaps` paths in the PR's ADRs/index and archived T02 self-references with their archive paths; correct the archived reference to the nonexistent `apps/api/src/users/`; verify each linked path exists in this branch.
- [x] 4.3 Update `AGENTS.md` so the PostGIS extension migration is documented as the authority, consistent with ADR-0019/0023 and the E2E provisioning script.
- [x] 4.4 Update `apps/api/.env.example`, `apps/api/.env.migration.example`, `.gitignore`, and `docs/testing/e2e.md` to document the restricted runtime URL, maintenance URL, and which E2E operations use each; verify all commands match the harness.

## 5. Verify the PR follow-up

- [x] 5.1 Run `npm test -- --runInBand` and `npm run test:e2e -- --runInBand` from `apps/api`, run the mobile E2E gate from `apps/mobile`, then run `npm run build`, `npm run lint`, and `npx tsc --noEmit` from `apps/api`; record suite and test counts. Results: unit 18 suites/104 tests; E2E 7 suites/30 tests; Maestro 3/3 flows; build, ESLint, TypeScript, and Prisma diff pass.
- [x] 5.2 Run `openspec validate t02-offer-contract-hardening --strict` and `openspec validate --specs`; review the final PR diff against the specs, design, and ADRs 0001, 0008, 0010, 0019, and 0026. Strict/change and main-spec validation pass; `git diff --check` is clean and archive references resolve.

## Workflow follow-up

- This follow-up is on the existing PR #6 branch and must be archived before its commits are pushed to that PR.
- Do not add offer/search HTTP routes or concrete agreement lifecycle adapters; T09/T10/T13 own those.
- Mobile/auth, API perimeter, offer-status vocabulary, and unrelated test-harness configuration issues remain separate audit follow-ups.
