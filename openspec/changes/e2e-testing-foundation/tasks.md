# Tasks

## 1. Per-worktree database

- [ ] 1.1 Write the failing test for the database-name derivation in `apps/api/test/worktree-database.spec.ts`: the same worktree always yields the same name, two different worktree paths yield different names, and every generated name ends in `_test`; verify it fails with `npm test -- worktree-database` from `apps/api`.
- [ ] 1.2 Implement the derivation in `apps/api/test/worktree-database.cjs` — a slug from the worktree directory plus a short hash of its absolute path — and make the test from 1.1 pass.
- [ ] 1.3 Extend `apps/api/test/run-e2e.cjs` to provision the derived database when `TUDOLAR_TEST_DATABASE_URL` is unset: create it if missing, install PostGIS, then apply migrations; keep honouring an explicit URL exactly as before, and keep the existing refusals for a non-local host and a name not ending in `_test`. Verify by running the suite in a worktree whose database does not exist yet and confirming it is created and migrated.
- [ ] 1.4 Reset the data before the suite: truncate every table in `public` except `_prisma_migrations` and the PostGIS metadata tables, with `RESTART IDENTITY CASCADE`, and expose a documented teardown that drops the worktree database. Verify determinism by running the suite twice and confirming both runs report the same result and that no row from the first run is visible in the second.
- [ ] 1.5 Seed a verified account through the project's own hasher so the mobile sign-in flow has a real account to use, since registration cannot complete without email delivery; verify the seeded account can sign in over HTTP with `curl` against the API on the worktree database.

## 2. Failure detection

- [ ] 2.1 Document and execute the deliberate-failure procedure: break one assertion in an existing E2E scenario, run the documented command, and record the named failure and non-zero exit; then restore the assertion and confirm the suite is green again. Record the exact command and both outputs as evidence.

## 3. Mobile device-level E2E

- [ ] 3.1 Install Maestro and record the installed version and the install command, since it is a machine-level Java CLI rather than an npm dependency; verify `maestro --version` reports it.
- [ ] 3.2 Add the documented command that starts the API against the worktree database and seeds it, so the mobile flows have something real to talk to; verify the API answers `GET /health` and the seeded account signs in while it is running.
- [ ] 3.3 Write the Maestro flows under `apps/mobile/e2e/` for the behavior that exists: sign-in is the first screen with no stored session; rejected credentials keep the user on sign-in with a message; accepted credentials reach the authenticated screen. Verify each flow runs against the booted simulator.
- [ ] 3.4 Run all three flows and record the pass output as evidence, including the command and the Maestro version used.

## 4. Conventions and CI follow-up

- [ ] 4.1 Write `docs/testing/e2e.md`: the entry points for API and mobile, how an agent adds a scenario for an acceptance criterion, how to diagnose a failure, the isolation and reset guarantees, the teardown, and the exact command and result every implementation-task handoff must carry; verify every command it names runs as written.
- [ ] 4.2 Update the root `AGENTS.md` and `README.md` to state that E2E coverage is required before implementing a feature's behavior, name the documented commands, and link the conventions; verify every path and command named exists.
- [ ] 4.3 Document the required CI follow-up, since the repository has no CI: a PostGIS service container for the API suite, and a macOS runner with Maestro and a booted simulator for the mobile flows, noting that the mobile flows cannot run on a Linux runner.

## 5. Integration verification

- [ ] 5.1 Prove isolation: run the API suite in two worktrees at the same time and confirm both are green, each against its own database, with no row visible across them.
- [ ] 5.2 Run the API unit suite and the E2E suite from `apps/api` and record the counts.
- [ ] 5.3 Confirm the mobile side is unchanged: `npm test`, `npx tsc --noEmit`, and `npx expo lint` from `apps/mobile`, with lint still at the 16-warning baseline.
- [ ] 5.4 Run `openspec validate e2e-testing-foundation --strict` and confirm it passes.

## Workflow follow-up

- Record the SDD marker for T-1 on the Notion backlog page and archive this change once the product owner's review is satisfied.
- T-1 is a global gate: every not-yet-Done backlog task, including SP01–SP12, waits for it.
