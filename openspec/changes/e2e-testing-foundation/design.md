# Design

## Context

See proposal.md — Why. Requirements are in `specs/testing/e2e-foundation/spec.md`.

This section is the investigation the task asks for: what exists today, and what that forces.

**What already exists (observed, not assumed).**

- `apps/api/test/run-e2e.cjs` is the API entry point: it runs `prisma generate`, then
  `prisma migrate deploy`, then jest with `test/jest-e2e.json`.
- `apps/api/test/setup-e2e.cjs` builds the environment: it generates an RSA key pair and an OTP
  pepper, sets `EMAIL_DELIVERY_MODE=test` and `SMS_DELIVERY_MODE=test`, and **validates**
  `TUDOLAR_TEST_DATABASE_URL` — it must be on `localhost`/`127.0.0.1`/`::1` and its database name
  must end in `_test`. That refusal is worth keeping.
- The specs drive the real Nest application with `supertest` against `app.getHttpServer()`. That
  exercises the real HTTP layer, the real Prisma client, and real WebAuthn verification against a
  real PostgreSQL — and because it is in-process, **it binds no port**, so parallel runs cannot
  collide on one.
- `docker/initdb/01-create-databases.sql` creates `tudolar_test` and installs PostGIS in both
  databases. So the disposable database is created once by the container, and **every worktree
  shares it**.
- There is **no `.github/workflows`**, so there is no CI to integrate into.
- `apps/mobile` has jest-expo and React Native Testing Library: 10 suites and 29 tests. All of them
  are component-level; there is no device-level runner. Maestro is **not** installed, but Java 17
  and Homebrew are, so it is installable.

**The constraints that shape the approach.**

- The `tudolar` role is a **cluster superuser** locally, because the PostGIS image's
  `POSTGRES_USER` is `tudolar`. Creating a database and creating the PostGIS extension both work;
  both were verified by creating and dropping them. This is a local convenience and must not be
  assumed in a shared environment.
- **PostGIS decides the isolation unit.** The extension lives in `public`. Isolating by schema would
  leave `geometry` and `ST_*` unresolved, which would silently break the geofence work in T04. A
  per-worktree *database* keeps the extension and the schema together.
- The database name must end in `_test`, which constrains the generated name rather than the other
  way round.

## Goals / Non-Goals

**Goals:**

- A green run in one worktree means the same thing as a green run in another, even at the same time.
- One command an agent can run without reading this document first.
- Evidence that the harness can fail, because a harness that cannot fail proves nothing.
- A mobile path that exercises the app against a real API over real HTTP, since the API suite runs
  in-process and never crosses the network.

**Non-Goals:**

- Replacing Jest, supertest, jest-expo, or React Native Testing Library.
- Making the mobile suite a mandatory CI gate; that needs a macOS runner and is a separate decision.
- Fixing existing coverage gaps, such as the device-level passkey assertion T00 recorded.

## Decisions

**Isolate by database, one per worktree, not by schema.** Verified above: a schema would lose the
PostGIS extension, and spatial types are load-bearing from T04 onward.
- Alternative considered: a schema per worktree inside `tudolar_test`, via Prisma's `?schema=`.
  Rejected for the PostGIS reason, not for convenience.
- Alternative considered: a PostGIS container per worktree with its own compose project. Rejected as
  the default: much slower to start per agent, and it multiplies the emulated-`amd64` containers the
  compose file already warns about on Apple Silicon. It stays available for a future CI runner.

**Derive the name deterministically from the worktree, and keep it disposable.** The harness
computes a slug from the worktree directory plus a short hash of its absolute path, so the same
worktree always gets the same database and two worktrees cannot collide. The name ends in `_test`,
so the existing refusal keeps working unchanged.
- Alternative considered: a random name per run. Rejected: it would leak databases on every run and
  make the environment hard to reason about.

**Honour an explicit `TUDOLAR_TEST_DATABASE_URL` and derive only when it is unset.** That keeps the
existing documented command, the CI story, and any deliberate override working, and confines the new
behavior to the case that needs it.

**Reset the data before the suite instead of recreating the database.** Recreating would re-run
migrations every time and be slow; truncation gives determinism cheaply. The reset truncates every
table in `public` except `_prisma_migrations` (the migration ledger) and the PostGIS metadata tables
(`spatial_ref_sys`, `geometry_columns`, `geography_columns`), with `RESTART IDENTITY CASCADE`. The
exclusion list is explicit so a reader can see exactly what is preserved.

**Keep supertest and the in-process application for the API suite.** It already proves the HTTP
contracts against real infrastructure, and binding no port is exactly what parallel worktrees need.
- Trade-off accepted: it does not exercise the production bootstrap or a bound port. The mobile
  flow below covers a real over-the-wire path, and a production-boot smoke check is recorded as a
  follow-up rather than pretended away.

**Use Maestro for the mobile flows, recorded as an explicit product-owner approval.** Maestro is
Expo's own recommendation for end-to-end tests, it drives the simulator without native test
configuration, and its flows are plain YAML under `apps/mobile/e2e/`. It extends the stack decisions
recorded in the backlog, so the approval is recorded here rather than assumed.
- Alternative considered: Detox. Rejected: it needs native build configuration and a longer setup
  for the same flows.
- Alternative considered: driving the Expo web build with Playwright. Rejected: it would not
  exercise the native client at all.
- Consequence to accept: Maestro is a Java CLI installed on the machine, not an npm dependency, so
  its version can drift between agents. The version is documented with the install command.

**Seed the verified account the sign-in flow needs, using the project's own hasher.** Registration
cannot complete locally — email delivery is unconfigured outside tests — so the harness inserts a
user with a verified email and an Argon2id hash produced by `Argon2PasswordHasher`'s parameters.
That keeps the flow real rather than bypassing authentication.
- Alternative considered: enabling the in-memory email adapter for the E2E environment. Rejected:
  `env.validation.ts` deliberately forbids the test adapters outside `NODE_ENV=test`, and loosening
  that to make a test convenient would weaken a real guard.

**Prove failure detection with a documented, reproducible mutation.** T-1 asks for a deliberate
failure to be detected. The harness ships a documented procedure — break one assertion, run, observe
the named failure and the non-zero exit, restore — and the recorded output becomes the evidence.
- Alternative considered: a permanently failing canary test. Rejected: a suite that is red by design
  trains agents to ignore red.

**Document the CI follow-up rather than adding CI.** There is no CI, and T-1's own instruction is to
document the follow-up in that case. The follow-up names the two things a workflow would need: a
PostGIS service container for the API suite, and a macOS runner with Maestro and a booted simulator
for the mobile flows.

## Risks / Trade-offs

- [Per-worktree databases need a privileged step locally] → creating the extension requires a role
  that can do it; the harness detects the failure and reports it as a concrete blocker instead of a
  confusing test error, and the privilege is documented as local-only.
- [Databases accumulate as worktrees come and go] → teardown is documented and the generated names
  share a prefix, so they are easy to find and drop.
- [Truncating every table could destroy reference data a future migration seeds] → the reset
  excludes the migration ledger and PostGIS metadata explicitly, and adding a table that must
  survive means adding it to that list, which is visible in one place.
- [Maestro is macOS-only and needs a booted simulator] → the mobile flows are documented as a local
  gate, and the CI follow-up records that they cannot run on a Linux runner.
- [The mobile flow depends on the API being up and seeded] → the documented command starts the API
  against the worktree database and seeds it, so a missing prerequisite fails with a clear message
  rather than a mysterious app error.
- [The API suite never crosses the network] → stated above as an accepted trade-off with a recorded
  follow-up, and partially covered by the mobile flow.
- [A derived database name could collide across machines on one host] → the hash covers the absolute
  worktree path, so two checkouts of the same branch in different directories differ.

## Migration Plan

No data migration and no schema change. Rollback is a revert of the commit; the generated databases
are disposable and their teardown is documented. The change is backwards compatible: an explicitly
set `TUDOLAR_TEST_DATABASE_URL` is honoured exactly as before, so the existing documented command
keeps working.

## Open Questions

- Whether the mobile flows join the mandatory gate in CI. It needs a macOS runner, and it does not
  change the approach or the task breakdown, so it is deferred to the CI follow-up.
- Whether the API suite should additionally boot the application as a separate process. The
  in-process approach is kept for now and the gap is recorded.
