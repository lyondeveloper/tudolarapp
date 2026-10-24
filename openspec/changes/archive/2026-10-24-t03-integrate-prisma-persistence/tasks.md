# Tasks

The repository-wide API and mobile E2E gate is a prerequisite for implementation. Before the red
phase, run `npm run test:e2e -- --runInBand` from `apps/api` and `npm run e2e` from `apps/mobile`;
do not proceed if either suite fails.

## 1. Audit the acceptance criteria

- [x] 1.1 Audit each T03 criterion (client generated, migrations reproducible, persistence and auth tests passing, no destructive changes, single migration authority) against the repository and write the evidence, with file and command references, to `docs/audits/t03-prisma-persistence-audit.md`. Verify every referenced path exists and every referenced command was run, with its result recorded.
- [x] 1.2 Confirm no second migration runner remains: run `grep -rn "node-pg-migrate" apps/api/package.json apps/api/package-lock.json apps/api/test apps/api/src docker` and record that it returns nothing.

## 2. Destructive-statement guard

- [x] 2.1 Red: add `apps/api/test/migration-safety/scan-migration-sql.spec.ts` with fixtures for `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, a data-losing `ALTER COLUMN ... TYPE`, a safe `ADD COLUMN`, and an allowlisted migration. Run `npm test -- --runInBand --runTestsByPath test/migration-safety/scan-migration-sql.spec.ts` from `apps/api`; verify it fails because the scanner does not exist.
- [x] 2.2 Green: implement `apps/api/test/migration-safety/scan-migration-sql.cjs` and the reviewed allowlist (each entry carries a `reason`); pass the spec from 2.1 with the same command.
- [x] 2.3 Red then green: add a spec in the same file that scans the real `apps/api/prisma/migrations/` directory and expects no findings. Run the same command; the spec must pass on the current history, and a temporary destructive fixture migration must make it fail (revert the fixture after observing it).

## 3. Migration reproducibility and catalog assertions

- [x] 3.1 Red: add `apps/api/test/e2e/migration-reproducibility.cjs` for the empty-database scenario: create a scratch local database, run `prisma migrate deploy`, run `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`, and assert the only difference is the documented hand-written constraints and extension. Add the script `test:e2e:migrations` to `apps/api/package.json`. Run `npm run test:e2e:migrations` from `apps/api` and record that the catalog assertion fails before the expected-constraint list exists.
- [x] 3.2 Green: add the explicit list of hand-written `CHECK` constraints and the `postgis` extension, asserted against `pg_constraint` and `pg_extension`; pass the empty-database scenario with the same command.
- [x] 3.3 Add the existing-rows scenario to the same script: apply only `20261015150121_init_identity_schema`, insert rows into `users`, `passkey_credentials`, `auth_sessions`, `auth_challenges`, `email_action_tokens`, and `phone_verification_challenges`, apply the remaining migrations, and assert every row is unchanged. Verify with `npm run test:e2e:migrations`, and verify the script drops only the scratch database it created.
- [x] 3.4 Wire `test:e2e:migrations` into `apps/api/test/run-e2e.cjs` next to the existing preflight so it runs under `npm run test:e2e`, and document the command in `docs/testing/e2e.md`. Verify `npm run test:e2e -- --runInBand` runs it and passes.

## 4. Identity repository spec

- [x] 4.1 Red: add `apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.spec.ts` with fake Prisma delegates asserting, for challenge consumption, email-token consumption, phone-challenge consumption, and session rotation, that the guarded `updateMany` is called with the expected `where` clause and that a zero-row result yields the documented failure outcome; and that records map to domain types without exposing ORM fields. Run `npm test -- --runInBand --runTestsByPath src/auth/adapters/out/persistence/prisma-identity.repository.spec.ts` from `apps/api`; verify the guard assertions fail against a deliberately weakened clause, then restore it.
- [x] 4.2 Green: pass the spec with the repository unchanged; if a path is not testable through the delegates, record that gap in the audit from 1.1 and rely on the named E2E suite, rather than changing behavior.

## 5. Spatial query layer

- [x] 5.1 Red: add `apps/api/src/database/spatial/proximity-filter.spec.ts` covering bound values, kilometre-to-meter conversion, rejection of non-allowlisted identifiers, non-finite/zero/negative/over-maximum radius, and out-of-range coordinates. Run `npm test -- --runInBand --runTestsByPath src/database/spatial/proximity-filter.spec.ts` from `apps/api`; verify it fails because the builder does not exist.
- [x] 5.2 Green: implement `apps/api/src/database/spatial/proximity-filter.ts` returning a `Prisma.Sql` fragment, with the identifier allowlist and no product maximum; pass the spec with the same command.
- [x] 5.3 Add an integration case to `apps/api/test/e2e/spatial-proximity.e2e-spec.ts` that executes the fragment against a temporary table with a `geography(Point,4326)` column inside a rolled-back transaction, asserts `ST_DWithin` returns a near row and excludes a far row, and leaves no table behind. Run `npm run test:e2e -- --runInBand test/e2e/spatial-proximity.e2e-spec.ts` from `apps/api`.
- [x] 5.4 Document the layer and its rules in `docs/adr/0023-postgis-through-prisma.md` and verify the ADR index still matches.

## 6. Verify

- [x] 6.1 Run `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run build`, `npm run lint`, and `npx tsc --noEmit` from `apps/api`, then `npm run e2e` from `apps/mobile`; record suite and test counts in the audit.
- [x] 6.2 Run `MIGRATION_DATABASE_URL="$(node -e 'process.stdout.write(require("./test/e2e-environment.cjs").resolveTestDatabase().migrationUrl)')" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` from `apps/api`; confirm no drift.
- [x] 6.3 Run `openspec validate t03-integrate-prisma-persistence --strict` and review the diff against the specs, the design, and ADR-0019, ADR-0020, and ADR-0023.

## Workflow follow-up

- Archive with `/openspec-archive-change`, then open the branch and PR; never push to `main` directly.
- Update the Notion T03 marker and comment on propose, apply, and archive.
- T04 consumes the spatial layer; T06 owns authentication gaps and is not part of this change.
