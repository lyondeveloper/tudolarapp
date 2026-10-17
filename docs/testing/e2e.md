# End-to-end testing

This is the foundation every backlog task depends on: **T-1 is a global gate**, so no not-yet-Done
task — including the discovery spikes — may begin until this suite can be trusted. Every
implementation task must add or update E2E coverage for its acceptance criteria **before**
implementing the feature, and cannot be marked Done until those scenarios pass.

## The two entry points

| What | Command | Working directory |
| --- | --- | --- |
| API end-to-end | `npm run test:e2e -- --runInBand` | `apps/api` |
| Mobile end-to-end | `npm run e2e` | `apps/mobile` |

Supporting commands, all from `apps/api`:

| Command | Purpose |
| --- | --- |
| `npm run test:e2e:api` | Run the API against this worktree's database, seeded, for the mobile flows |
| `npm run test:e2e:seed` | Seed the account the mobile flows sign in with |
| `npm run test:e2e:teardown` | Drop this worktree's disposable database |

### Prerequisites

- Docker running, with the repository's database container up (`docker compose up -d` at the root).
- **Maestro 2.11.0** for the mobile flows: `brew trust mobile-dev-inc/tap`, then
  `brew install --formula mobile-dev-inc/tap/maestro`. The tap-qualified formula matters —
  `brew install maestro` resolves to an unrelated cask of the same name. Maestro enables anonymous
  analytics by default; the documented command sets `MAESTRO_CLI_NO_ANALYTICS=1`.
- A booted iOS simulator with the app installed (`npx expo run:ios` from `apps/mobile`), and Metro
  running, for the mobile flows.
- For the mobile flows, the API must be up against this worktree's database: run
  `npm run test:e2e:api` from `apps/api` first.

## Isolation: one database per worktree

Parallel worktrees must not observe each other's rows, so each gets its own disposable database.

- The name is derived from the worktree path: `tudolar_e2e_<slug>_<hash>_test`. It is stable for a
  given worktree, different for another, and always ends in `_test`, which the harness requires.
- The harness creates the database if it is missing, applies migrations (the
  `--create-only` migration that installs PostGIS among them), and **truncates the data before
  running** so a result never depends on a previous run. It excludes `_prisma_migrations` (the
  migration ledger) and `spatial_ref_sys` (PostGIS reference data).
- `npm run test:e2e:teardown` drops only this worktree's own database — the name is recomputed, never
  accepted as an argument — and the next suite run recreates it.
- An explicit `TUDOLAR_TEST_DATABASE_URL` is still honoured exactly as before, and the harness still
  refuses a non-local host or a database whose name does not end in `_test`.

Installing the PostGIS extension needs a privileged role, so it is done by the Prisma migration
that `prisma migrate deploy` applies, not by the harness. The local container provides the
privilege because the PostGIS image's `POSTGRES_USER` is the cluster superuser; a shared environment
will not, so the migration fails loudly at deploy time rather than leaving the suite to fail with a
confusing query error.

The API suite drives the real application in-process with `supertest`, so it binds no port and
parallel worktrees cannot collide on one. The mobile flows exercise the real over-the-wire path.

## Adding a scenario for an acceptance criterion

**API.** Add it to `apps/api/test/e2e/<area>.e2e-spec.ts`, following `auth.e2e-spec.ts`. End-to-end
scenarios live in their own folder, separate from the shared helpers in `apps/api/test/`. Assert the
observable contract — status code, response shape, and what the database then holds — not internal
calls. Prefer a fresh identifier per scenario so scenarios cannot depend on each other's rows.

**Mobile.** Add a flow under `apps/mobile/e2e/`, following the existing three. Two rules that cost
real debugging time:

- **Always set `clearKeychain: true` alongside `clearState: true`.** `clearState` clears the app's
  data container but not the iOS Keychain, where `expo-secure-store` keeps the refresh token, so a
  previous flow's sign-in leaks into the next one and every later flow fails.
- **Dismiss system dialogs conditionally.** After a successful sign-in iOS offers to save the
  password, and that dialog obscures the screen. Guard with `runFlow: when: visible: 'Not Now'`.

Target elements by `testID`, not by label text: a label tap does not focus its field. Add a testID
to the component if one is missing — that is test support, not a feature change.

## Diagnosing a failure

1. Read the named failure. A scenario name plus a non-zero exit is the whole point of this harness.
2. For the mobile flows, Maestro writes screenshots, the screen hierarchy, and logs to
   `~/.maestro/tests/<timestamp>/`. **Read the screenshot first** — an obscured but correct screen
   and a genuinely wrong screen look identical in the assertion message.
3. Check the prerequisites before suspecting the code: is the container up, is the API running
   against *this* worktree's database, is Metro running, is the app installed on the booted
   simulator?
4. Reproduce the API failure in isolation with `npm test -- --runInBand -t '<scenario name>'` from
   `apps/api`, or run a single mobile flow with `maestro test e2e/<flow>.yaml`.

To prove the harness still detects failure, break one assertion, run the entry point, and confirm a
named failure with a non-zero exit, then restore. Do not leave a permanently failing canary: a suite
that is red by design trains agents to ignore red.

## What every handoff must carry

For any implementation task, include:

- the E2E scenarios added or updated, named;
- the exact command run and its result — the pass counts, not a claim that it passed;
- any scenario you could not implement, with the concrete blocker, and the task left not-Done.

## CI

There is no CI in this repository, so T-1 requires the follow-up to be documented rather than
silently skipped:

- The API suite needs a **PostGIS service container** and a database whose name ends in `_test`.
  Setting `TUDOLAR_TEST_DATABASE_URL` explicitly is enough; the derivation is not required there.
- The mobile flows need a **macOS runner** with Maestro installed, a booted simulator, and the app
  built and installed, plus the API running against a seeded database. They **cannot** run on a
  Linux runner, so mobile E2E is currently a local gate.
- Whether the mobile flows join the mandatory gate is an open decision that needs that macOS runner.
