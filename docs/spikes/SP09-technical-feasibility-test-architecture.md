# SP09 — Validate technical feasibility and test architecture

Research-only spike. Nothing here is implemented, and no framework decision is reopened.

## 1. Task and acceptance criteria

Quoted from the backlog (`/tmp/backlog2.md`, SP09):

> **Suggested owner:** Technical lead + QA. **Depends on:** T00; independent spike, parallelizable.
> - Investigate implementation patterns, compatibility, and risks for the approved stack: NestJS
>   hexagonal architecture, Prisma/Prisma Migrate, PostgreSQL/PostGIS, API contracts, React
>   Native/Expo, RTK Query, and gluestack. Do not reopen selected framework decisions or add
>   frameworks without an approved ADR.
> - Investigate atomic inventory reservations under concurrency, idempotency, immutable terms
>   versions, geospatial query safety, and migration of the existing migration history without
>   divergent sources of truth.
> - Produce a test design for unit, integration, end-to-end, concurrency, geofence, and failure
>   cases; do not implement the features during the spike.
>
> **Acceptance criteria:** a reviewed domain/API/data model, implementation sequence,
> concurrency/geospatial test strategy, migration risks, and unresolved technical decisions are
> ready for T02/T03.

Constraint from `docs/spikes/README.md:37-47`: ground every claim, never invent product rules,
and respect the agreed stack. Constraint from the task brief: the E2E foundation already exists
(`docs/testing/e2e.md`); build on it, do not redesign it.

## 2. Evidence and sources

### 2.1 Observed — the stack and its wiring

- API dependencies (`apps/api/package.json:31-77`): NestJS `^11`, Prisma `^7.10.0`,
  `@prisma/adapter-pg ^7.10.0`, `@simplewebauthn/server ^14`, `argon2 ^0.45`,
  `class-validator ^0.15`, `@nestjs/throttler ^6`. Mobile (`apps/mobile/package.json`): `expo
  ~57.0.30`, `react-native 0.86.3`, `react 19.2.3`, `@reduxjs/toolkit ^2.13.0`,
  `@gluestack-ui/core ^5.0.15`, `uniwind ^1.12.2`, `react-hook-form ^7.90.0`.
- Hexagonal shape is real only in `auth/` (`docs/audit/t00-baseline.md:100-116`): `domain/`,
  `application/` with `auth.ports.ts`, `adapters/in/http/` with DTOs, `adapters/out/persistence/`.
  `app.module.ts:19-30` enables `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
- RTK Query is a single `createApi` slice, `apps/mobile/src/services/api.ts:43-99`, with
  `prepareHeaders` injecting the bearer token from the session slice and `tagTypes: ['CurrentUser']`.

### 2.2 Observed — concurrency and atomicity patterns already in the codebase

These are the load-bearing precedents SP09 should reuse rather than reinvent:

- **Compare-and-swap via `updateMany`, not read-then-write.** `rotateSession`
  (`prisma-identity.repository.ts:534-585`) revokes the presented refresh token with an
  `updateMany` guarded by `revokedAt: null` and treats a zero count as replay, revoking the whole
  token family; the comment at `:542-545` states it replaces `SELECT ... FOR UPDATE`. The e2e
  test at `test/auth.e2e-spec.ts:216-261` asserts the replay is rejected.
- **Single-use challenge/token consumption** is the same CAS: `consumeAuthChallenge:294-304`,
  `completeEmailVerification:334-350`, `resetPassword:397-407` all consume first and abort on
  `count === 0`.
- **Raw SQL only where Prisma has no equivalent**: `updatePasskeyCounter:172-185` uses
  `$executeRaw` with `GREATEST(...)` to keep the counter monotonic.
- **Atomic increment**: `verifyPhoneChallenge:454-490` uses `attempts: { increment: 1 }` so
  concurrent failures cannot lose a count.
- **Unique-violation handling inside a transaction**: `createPasswordAccount:114-146` catches
  `P2002` to keep registration non-disclosing.

### 2.3 Observed — schema, migrations, and the divergence

- `prisma/schema.prisma:1-8` states that CHECK constraints **and** the PostGIS extension "are
  therefore appended by hand to the generated migration SQL." The single migration
  (`prisma/migrations/20261015150121_init_identity_schema/migration.sql`) does contain six
  hand-written CHECK constraints (`:144-165`) but **contains no `CREATE EXTENSION`**. PostGIS is
  installed by `docker/initdb/01-create-databases.sql` and again per test database by
  `test/provision-e2e-database.cjs:43-55`.
- `docs/audit/t00-baseline.md:450` (F-4) records exactly this drift: a database created without
  the init script lacks PostGIS, and the next `prisma migrate dev` cannot add it.
- Partial unique indexes are declared in the schema through the `partialIndexes` preview feature
  (`schema.prisma:15-16,44-46`) and Prisma Migrate emits them (`migration.sql:94-100`) — so the
  earlier "hand-edited SQL" hazard does not apply to this project's partial indexes.
- `prisma/migrations/migration_lock.toml` pins the provider; `prisma.config.ts:4-16` resolves
  `DATABASE_URL` from the environment. A filesystem listing of `apps/api` shows `prisma/migrations`
  as the only migrations directory, so no second runner exists today.
- No spatial table exists yet; the `Unsupported("geometry")` mapping decision is still open
  (`AGENTS.md:42`).

### 2.4 Observed — the test architecture SP09 must build on

- `docs/testing/e2e.md` defines two entry points: API `npm run test:e2e -- --runInBand` (supertest,
  in-process, binds no port) and mobile `npm run e2e` (Maestro 2.11.0). Isolation is one disposable
  database per worktree, truncated before each run, excluding `_prisma_migrations` and
  `spatial_ref_sys` (`test/reset-e2e-database.cjs:18-44`).
- The API runner (`test/run-e2e.cjs:27-58`) runs `prisma generate`, `prisma migrate deploy`, the
  reset, then jest; `test/setup-e2e.cjs:4-38` builds the environment and refuses a non-local host or
  a name not ending in `_test`. `provision-e2e-database.cjs:43-55` installs PostGIS per database.
- New API scenarios go in `test/<area>.e2e-spec.ts`, assert the observable contract, and use fresh
  identifiers (`docs/testing/e2e.md:56-60`). Mobile flows live in `apps/mobile/e2e/` with
  `clearKeychain: true` and conditional system-dialog dismissal (`:62-72`).
- Unit tests are `*.spec.ts` under `src/` (`package.json:79-105`, `testRegex: ".*\\.spec\\.ts$"`);
  there is **no separate integration config** — integration is currently folded into the e2e suite,
  which drives the real Prisma client against real PostgreSQL.

### 2.5 Assumed, not verified

- PostGIS `geography` vs projected `geometry` performance at pilot volume is **not measured** —
  no representative data exists. Any performance claim here is a hypothesis to validate with
  `EXPLAIN ANALYZE` on seeded data (`AGENTS.md:48`).
- gluestack `5.0.15` + `uniwind` beyond the generated components is **not exercised** by any
  screen; compatibility for map/list screens is assumed.
- The availability, terms-version, and geofence data models are **owned by SP02/SP03/SP04/SP05** and
  are not known here. SP09 investigates the *mechanisms*, not the product values.

## 3. Options considered

### 3.1 Atomic inventory reservation under concurrency

- **A. Single-statement CAS with `RETURNING`** (`$queryRaw`, e.g. `UPDATE ... WHERE available >=
  $n RETURNING ...`). Pros: one atomic statement, returns the row, no lock ordering, mirrors the
  sanctioned `RETURNING`-as-CAS in `AGENTS.md:41`. Cons: raw SQL island; Prisma cannot model it.
  **Kept.**
- **B. Prisma `updateMany` CAS.** Pros: no raw SQL. Cons: Prisma `where` cannot compare two columns,
  so an `available - reserved >= n` guard is inexpressible without a maintained guard column; it
  returns only a count, not the row. **Kept only when the caller does not need the row back.**
- **C. `SELECT ... FOR UPDATE` then update.** Pros: familiar. Cons: `AGENTS.md:41` prefers CAS and
  forbids downgrading an atomic guard to read-then-write; adds lock-ordering/deadlock surface.
  **Rejected as the default** (stays available inside one transaction if a multi-row lock is ever
  unavoidable).
- **D. Serializable isolation + retry loop.** Pros: strong guarantee without explicit guards. Cons:
  retries and abort handling on every hot path. **Rejected as default; acceptable fallback.**

Recommendation: A or B inside one `$transaction` scoped to the reservation; keep the invariant
(`reserved >= 0`, `completed >= 0`, `reserved + completed <= initial`) as a DB CHECK in a
`--create-only` migration, the same class of object as the existing six CHECKs. Whether availability
is stored or derived, and what "reserved" means, is SP03's decision (unresolved, §5).

### 3.2 Idempotency

- **A. Unique constraint on the transition event** (e.g. one confirmation row per party per
  agreement) so a replay violates `P2002` and is absorbed like `createPasswordAccount:139-144`.
  **Kept.**
- **B. Persisted request idempotency key** with a unique index, returning the first result on
  replay. Pros: covers arbitrary retries. Cons: extra table and retention. **Kept for writes that
  cross a network boundary and may be retried by the client.**
- **C. Optimistic `version` column on the aggregate.** Pros: detects lost updates. Cons: does not by
  itself deduplicate a retried identical request. **Kept as a complement, not the primary.**

### 3.3 Immutable terms versions

- **A. Append-only `offer_terms_versions` table**; the offer row points at the current version and
  every confirmation/agreement stores the version id it agreed to. Pros: history is explicit and
  queryable; edits insert, never update. **Kept.**
- **B. JSONB snapshot copied onto the agreement at confirmation.** Pros: self-contained. Cons:
  duplicates the terms and can drift from the offer's history. **Kept only as a denormalized copy of
  the referenced version, not the source.**
- **C. Mutate the offer row and trust application code.** Pros: simplest. Cons: breaks "edits cannot
  silently change confirmed terms" (SP02 acceptance) and cannot be audited. **Rejected.**

Recommendation: A. A unique `(offer_id, version)` plus an offer→current-version FK; immutability of
version rows can be enforced with a trigger or a revoked privilege, which is **unmodelled by Prisma**
and therefore hand-written SQL in a `--create-only` migration — the same drift risk as CHECKs, so it
must be verified against `pg_constraint`/`pg_trigger` (`AGENTS.md:39`).

### 3.4 Geospatial query safety

- **A. `geography` + `ST_DWithin` (meters).** Pros: unit-correct distances, no SRID projection
  mistake. Cons: slower than geometry; needs a GiST index. **Kept.**
- **B. `geometry` in a projected metric SRID.** Pros: faster. Cons: requires a consistent SRID and a
  deliberate projection; a wrong SRID silently mis-measures. **Kept if measurements show A is too
  slow at pilot volume.**
- Safety rules regardless of choice: parameters only (`Prisma.sql`/tagged templates), never string
  interpolation of coordinates (`AGENTS.md:44`); market scope is always in the same `WHERE` as the
  proximity predicate so no query can return an out-of-node offer (SP05 acceptance); explicit
  allowlists for dynamic ORDER BY; the LLM never produces SQL (`AGENTS.md:11,52`). The polygon
  source and boundary-inclusion rule are SP05's decision (unresolved, §5).

### 3.5 Reconciling the existing migration history

- **A. Move `CREATE EXTENSION postgis` into a `--create-only` Prisma migration** and make
  `migrate deploy` provision it. Pros: one source of truth, matching `AGENTS.md:39`. Cons: the
  extension needs a privileged role, which contradicts least privilege for the app role
  (`AGENTS.md:51`); a shared environment may not grant it. **Kept with a role split.**
- **B. Keep provisioning external and add a loud assertion** (startup/health check that PostGIS is
  present, failing clearly if not). Pros: honors least privilege. Cons: still two places — a
  provisioner and a check — but the code only *verifies*, never *creates*. **Kept as the complement
  to A.**
- **C. Squash/baseline the migration now.** Rejected: there is exactly one migration and it is the
  identity schema; squashing adds risk without benefit. The *policy* for future spatial migrations
  still needs deciding (unresolved, §5).

Recommendation: single authority stays `apps/api/prisma/migrations`. Put the extension in a
`--create-only` migration intended to run under a privileged migration role, keep
`docker/initdb/01-create-databases.sql` as a dev-only convenience, and add a startup assertion so a
missing extension fails loudly instead of as a confusing test error. Correct the `schema.prisma`
comment that claims the extension is in the migration (F-4). Add a check that no second runner or
residual `node-pg-migrate` artifacts exist.

## 4. Recommendation

1. **Reuse the existing atomic idiom, do not invent a new one.** Reservation, confirmation, and
   idempotency are single-statement CAS inside one short `$transaction`, exactly as
   `rotateSession`/`consumeAuthChallenge` already do. Keep raw SQL confined to `adapters/out/`
   repositories behind a port; never let it reach `domain/` or `application/` (`AGENTS.md:56,64`).
2. **Push invariants into the database**: CHECK constraints for non-negativity and
   `reserved + completed <= initial`, a unique index for idempotency, and an FK from agreements to
   the immutable terms version. Accept that CHECKs and any immutability trigger are hand-written
   SQL that a future `migrate dev` must not drop.
3. **One migration authority.** Extension and unmodelled objects live in `--create-only`
   migrations under a privileged role, with an assertion that the extension exists. Fix the F-4
   drift and the misleading `schema.prisma` comment.
4. **Geospatial safety is a query-construction rule**: parameterized SQL, market scope co-located
   with the proximity predicate, GiST index, and `EXPLAIN ANALYZE` on seeded data before any
   optimization claim.
5. **Test design extends the existing harness**, adding layers the harness lacks (integration and
   concurrency) without replacing anything. Commands come from `docs/testing/e2e.md`; SP09 does not
   redefine them.

### 4.1 Proposed implementation sequence (for T02/T03)

1. T02: publish ADRs for the reservation CAS, idempotency key, terms-version storage, geospatial
   SRID/type, and the PostGIS provisioning authority. Freeze the API contract for offers,
   confirmations, and search.
2. T03: reconcile migrations (F-4), add the startup PostGIS assertion, and add an integration-test
   convention against the disposable database.
3. T04/T05: first spatial table + `Unsupported("geometry")` mapping, market scope, and the geofence
   test matrix.
4. T07–T14: offers/reservations, then chat/exchanges, each with its e2e scenario written first.

### 4.2 Test design

| Layer | Location / command | Scope |
| --- | --- | --- |
| Unit | `apps/api/src/**/*.spec.ts`; `npm test -- --runInBand` | Domain invariants (availability arithmetic, terms-version rules, criteria validation) and use cases with mocked ports. |
| Integration | New `*.int-spec.ts` under the existing harness, same disposable DB; run with the e2e runner | Repositories and CAS statements against real PostgreSQL, including the CHECKs and unique indexes. |
| E2E | `apps/api/test/<area>.e2e-spec.ts`; `npm run test:e2e -- --runInBand` | HTTP contract, authorization, market scoping, reservation lifecycle observable outcome. |
| Concurrency | Inside `*.e2e-spec.ts`, fire N `supertest` requests with `Promise.all` | Exactly one reservation wins, availability never negative, replay of a confirmation is idempotent — mirrors `auth.e2e-spec.ts:216-261`. |
| Geofence | Seeded spatial fixtures in `test/support/`, same DB | Inside/boundary/outside, radius crossing a boundary, GPS off/denied — no out-of-node offer ever returned. |
| Failure | Mixed layers | Invalid DTOs → 400, unauthenticated → 401, not-owner → 403/404, insufficient inventory → 409, expired terms version, and a loud provisioning failure when PostGIS is absent. |

Fixtures follow `test/seed-e2e.cjs` (direct SQL, project's own hasher) and the fresh-identifier rule (`docs/testing/e2e.md:59-60`). Mobile keeps its Maestro flows; new screens add `testID`s.

## 5. Unresolved decisions

| # | Decision | Owner |
| --- | --- | --- |
| U1 | Availability data model: stored counters vs derived, and the meaning of "reserved". | SP03 → T03 |
| U2 | Idempotency-key semantics, retention, and the conflict status code. | SP04 → T02 |
| U3 | Terms-version storage shape and whether immutability is enforced by a trigger or app-only. | SP02 → T03 |
| U4 | Geofence polygon source, boundary inclusion, and SRID/type (geography vs metric geometry). | SP05 → T04 |
| U5 | PostGIS provisioning authority: privileged migration vs external bootstrap plus assertion. | T02/T03 + ops |
| U6 | Integration-test file convention (`*.int-spec.ts` vs folding into e2e). | T02 + QA |
| U7 | `Unsupported("geometry")` mapping before the first spatial model. | T03/T04 |
| U8 | Monetary/minor-unit representation in Prisma (Prisma has no decimal-with-scale guarantee). | SP02 → T03 |

## 6. Product and technical impact

- **Product:** SP09 invents no rule. It surfaces that oversell must be impossible (concurrency),
  that a double confirmation must be safe (idempotency), that confirmed terms must not change under
  a party (versions), and that a search must never leak an out-of-node offer (geofence). These are
  product-visible guarantees owned by SP02–SP05.
- **Technical:** the CAS and geospatial SQL become small, well-tested islands in `adapters/out/`
  behind ports; the database enforces the invariants. The migration history keeps one authority once
  F-4 is reconciled. Mobile feasibility rests on RTK Query's single cache (availability must
  invalidate offer tags) and gluestack's token contract, neither of which changes.

## 7. Testable scenarios

- **WHEN** N buyers confirm the same offer simultaneously and only K whole transactions fit
  **THEN** exactly K reservations succeed, `available` never goes negative, and the losers get a
  controlled conflict.
- **WHEN** a confirmation is retried with the same idempotency key
  **THEN** it returns the original outcome and does not reserve twice.
- **WHEN** a seller edits an offer after both parties confirmed
  **THEN** the confirmed agreement still shows the version that was confirmed and requires
  reconfirmation.
- **WHEN** an offer is at a coordinate inside, exactly on the boundary, and outside the market
  **THEN** only inside (and boundary, per the decided rule) offers are returned, and a radius that
  crosses the boundary never returns an out-of-node offer.
- **WHEN** GPS is denied
- **THEN** search still runs over the whole active node without narrowing or expanding it.
- **WHEN** the database lacks PostGIS
- **THEN** provisioning/startup fails with a concrete message, not a confusing test error.
- **WHEN** a duplicate username/email is registered
- **THEN** the response is unchanged and non-disclosing (existing behavior preserved).

## 8. Sources reviewed

- `AGENTS.md` (full) — architecture, PostgreSQL/PostGIS, Prisma, security rules.
- `docs/spikes/README.md` — protocol.
- `docs/testing/e2e.md` — entry points, isolation, conventions.
- `docs/architecture.md`, `docs/flows/authentication.md`, `docs/flows/search-and-contact.md`,
  `docs/flows/seller-offer-lifecycle.md`.
- `docs/audit/t00-baseline.md` — inventory and findings F-1…F-10.
- `README.md`.
- `/tmp/backlog2.md` — SP09 (and SP02–SP05, T00 context).
- `apps/api/prisma/{schema.prisma,prisma.config.ts}` and
  `prisma/migrations/20261015150121_init_identity_schema/migration.sql` + `migration_lock.toml`.
- `apps/api/src/app.module.ts`; `apps/api/src/auth/{application/auth.ports.ts,application/session.service.ts,adapters/out/persistence/prisma-identity.repository.ts}`.
- `apps/api/test/{run-e2e,setup-e2e,e2e-environment,reset-e2e-database,provision-e2e-database,seed-e2e}.cjs`,
  `apps/api/test/{jest-e2e.json,auth.e2e-spec.ts}`.
- `apps/api/package.json`, `apps/mobile/package.json`, `apps/mobile/src/services/api.ts`,
  `apps/mobile/e2e/03-accepted-credentials.yaml`.
- `docker-compose.yml`, `docker/initdb/01-create-databases.sql`.
- `openspec/config.yaml`, `openspec/specs/testing/e2e-foundation/spec.md`,
  `openspec/changes/archive/2026-10-17-e2e-testing-foundation/design.md`.
- URLs: `https://www.prisma.io/docs/orm/prisma-migrate`,
  `https://postgis.net/docs/ST_DWithin.html`, `https://www.postgresql.org/docs/current/ddl-constraints.html`.
