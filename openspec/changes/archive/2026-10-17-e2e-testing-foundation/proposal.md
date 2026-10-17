# Proposal

## Why

The backlog changed shape. Work now runs as a dependency graph with parallel agents in separate
worktrees, and a mandatory gate — **T-1** — blocks every not-yet-Done task, including the SP01–SP12
discovery spikes, until a repeatable end-to-end testing foundation exists. Every implementation task
must also add or update E2E coverage for its acceptance criteria *before* implementing the feature.

Nothing in the repository survives that parallelism today:

- The API suite targets **one shared `tudolar_test` database** on port 5433. Two worktrees running
  concurrently interleave in the same tables, so a green run stops being evidence.
- There is **no CI**.
- The **mobile app has no end-to-end runner at all**. Its 29 tests are component-level render tests,
  so the backlog's "add E2E before the feature" rule has nothing to build on for any mobile task.

T00's audit also showed that this app once passed typecheck and lint while it could not even run, so
"it passes locally" is not something to rely on here.

## What Changes

- Give **each worktree its own disposable PostGIS database**, named deterministically from the
  worktree path, created on demand, migrated, and **reset between runs**, with a documented
  teardown. This is the change that makes parallel worktrees safe.
- Keep one documented entry point that provisions, migrates, resets, and runs the suite, and keep
  the existing refusal to target a non-local host or a database whose name does not end in `_test`.
- **Prove the harness detects failure**: a documented, reproducible way to make a scenario fail and
  observe it as a failing test.
- Add **device-level E2E for the mobile client using Maestro**, Expo's recommended E2E tool, driving
  the flows that genuinely exist: sign-in is the first screen, rejected credentials keep the user
  there, accepted credentials reach the authenticated screen. Adopting Maestro extends the recorded
  stack decisions, so it is recorded as an explicit product-owner approval rather than assumed.
- Document the **conventions**: how an agent adds a scenario for its acceptance criteria, how to
  diagnose a failure, and the exact command and result every implementation-task handoff must carry.
- Document the **CI follow-up**, because the repository has no CI and T-1 asks for a documented
  follow-up in that case.

## Capabilities

### New Capabilities

- `testing/e2e-foundation`: the guarantees the end-to-end harness provides — isolation per
  worktree, reproducibility, failure detection, and the documented entry point and conventions.

### Modified Capabilities

None. The application's behavior does not change; this establishes how it is verified.

## Impact

- `apps/api/test/` — the runner, its setup, and the reset step.
- `apps/mobile/e2e/` (new) — Maestro flows for the existing mobile behavior.
- `docker/` — provisioning for per-worktree databases, including the PostGIS extension.
- `docs/testing/e2e.md` (new) — the conventions and the diagnosis path.
- `apps/api/package.json`, `apps/mobile/package.json` — the documented commands.
- `AGENTS.md` and `README.md` at the root — the E2E requirement and where the conventions live.
- Machine-level: **Maestro** is a Java-based CLI, not an npm package, so it is a documented
  prerequisite rather than a dependency. Java 17 and Homebrew are already present.

### Out of scope

- **No product feature work and no new product behavior.** T-1 explicitly forbids implementing
  features.
- **Not fixing existing test gaps.** The device-level passkey assertion T00 recorded as unverified
  belongs to T06; this change does not pretend to close it.
- **No CI workflow.** The repository has none, so T-1's own instruction is to document the required
  follow-up; a workflow would need the PostGIS service container and is a separate decision.
- **No change to application runtime behavior, contracts, schema, or dependencies of the app
  itself.**
- **No new unit-test framework.** Jest, supertest, jest-expo, and React Native Testing Library stay
  as they are.

### Source

Notion T-1 — Establish the E2E Testing Foundation — https://app.notion.com/p/d358155c3492473581e0c058e08e3b36
