# Design

## Context

See proposal.md — Why. Observed state: `apps/api/prisma/` holds `schema.prisma` and four migrations (`init_identity_schema`, `add_postgis_extension`, `offer_terms_versions_immutability`, `offer_terms_version_checks`); `PrismaService` connects through `@prisma/adapter-pg` and asserts PostGIS at startup; `PrismaIdentityRepository` implements `IdentityRepositoryPort` and already uses `updateMany` compare-and-swap inside `$transaction` for challenge and session rotation. `npm run test:e2e` creates a database, runs `prisma migrate deploy`, and runs the suites; `offer-terms-version-preflight.cjs` already proves one constraint migration against one invalid row. ADR-0019 and ADR-0023 fix Prisma as the sole schema authority and PostGIS access through `$queryRaw`.

## Goals / Non-Goals

**Goals:**
- Turn T03's acceptance criteria into checks that run, not statements that are asserted.
- Give later tasks one safe way to write spatial SQL.

**Non-Goals:**
- No schema change and no new migration.
- No `Unsupported("geometry")` mapping and no spatial table (decided with the first spatial table, T04).
- No change to identity behavior, ports, or HTTP contracts.

## Decisions

**1. Reproducibility is checked in a scratch database, in the existing preflight style.** A new script beside `offer-terms-version-preflight.cjs` creates a uniquely named local scratch database, applies all migrations from empty, then runs `prisma migrate diff --from-config-datasource --to-schema` and the catalog assertions. A second scenario applies only `init_identity_schema`, inserts rows into every identity table, applies the rest, and asserts the rows survive. It refuses non-local hosts and drops only the database it created, reusing the safeguards already in the preflight. Alternative: reuse the shared E2E database. Rejected because that harness truncates data and cannot show an "existing rows" state.

**2. The destructive-statement guard is a pure function plus an allowlist file.** `scanMigrationSql(sql)` returns the matching statements with line numbers; a Jest spec drives it with fixtures, and a second spec runs it over the real `prisma/migrations/` directory. The allowlist is a reviewed JSON file keyed by migration name with a mandatory `reason`. It is a pure text scan and does not parse SQL, so it errs toward false positives, which the allowlist resolves. Alternative: rely on review alone. Rejected: `AGENTS.md` makes "no unapproved destructive changes" a requirement, and review alone is not repeatable.

**3. Catalog assertions list the hand-written constraints explicitly.** One E2E spec asserts the named `CHECK` constraints and the `postgis` extension against `pg_constraint` and `pg_extension`. Alternative: derive them by diffing. Rejected: Prisma does not introspect `CHECK` constraints, so a diff cannot see them.

**3b. The repository spec is a unit spec with fake delegates; atomicity stays in E2E.** `prisma-identity.repository.spec.ts` (adapter layer) fakes the Prisma delegates to verify the mapping boundary and that every consume/rotate path issues a guarded `updateMany` with the expected `where` clause and honours a zero-row result. It cannot prove atomicity, so the existing `auth.e2e-spec.ts` and `phone-verification-concurrency.e2e-spec.ts` remain the evidence for real races.

**4. The spatial layer is a small pure builder in `apps/api/src/database/spatial/`.** It belongs to infrastructure. It exposes `proximityFilter({ table, geographyColumn, longitude, latitude, radiusMeters, maxRadiusMeters })` returning a `Prisma.Sql` fragment (`ST_DWithin(col::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)`), validates ranges, and checks identifiers against an allowlist registered by the owning module. There is no product maximum: the caller supplies `maxRadiusMeters`. No spatial table exists, so the allowlist starts empty and unit tests register fixture identifiers. Alternative: build this in T04 with the first spatial table. Rejected only partially: the helper is small and the criterion names it, but it has no consumer yet, so it stays minimal and unexported from any module until T04 uses it.

## Risks / Trade-offs

- [The spatial helper has no consumer and may need reshaping in T04] → Keep it minimal and pure; T04 may adjust it with its first table, and its tests move with it.
- [The text scan flags a safe statement or misses an obfuscated one] → Allowlist resolves false positives; it is a guard rail beside review, not a SQL parser.
- [The scratch-database scripts need a privileged local Postgres] → They reuse the maintenance URL and local-host guard already used by the preflight, and run only through `npm run test:e2e`.
- [A fake-delegate repository spec can pass while real SQL behaves differently] → Atomicity keeps its real-database E2E coverage; the spec asserts only the guard shape.

## Migration Plan

No schema or data change, so there is nothing to deploy or roll back. The change adds test tooling and one unused-in-production helper; rollback is a revert of the commit.

## Open Questions

None that change the specs or tasks. Where the allowlist file lives (`apps/api/prisma/` or `apps/api/test/`) is resolved at implementation and does not affect behavior.
