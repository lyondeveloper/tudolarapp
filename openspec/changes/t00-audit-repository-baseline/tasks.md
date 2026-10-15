# Tasks

> **Note (pre-apply sync):** section 1 was completed *before* this change was applied. The working
> tree held roughly 1700 uncommitted lines from an earlier agent, and they had to be committed
> before the audit could describe a fixed revision. The commits are recorded below as evidence.
> Everything from section 2 onward is the remaining work.

## 1. Establish the baseline revision — done before apply

- [x] 1.1 Confirm the current branch and record `git log --oneline -5` as the pre-audit state. Branch `main`.
- [x] 1.2 Verify `git status` matches the expected pending set and note anything unexpected. 15 modified, 5 deleted, 9 new.
- [x] 1.3 Confirm no secret is staged: `apps/mobile/.npmrc` holds only `legacy-peer-deps=true`, and no secret pattern matched any pending file.
- [x] 1.4 Commit the Prisma persistence port — `26c39ea`.
- [x] 1.5 Commit the `apps/mobile/` Expo scaffold — `e60946a`.
- [x] 1.6 Commit the local environment files and the documentation updates — `f918287`, `2bb5b62`.
- [x] 1.7 Commit this change proposal itself — `6c9b582`.
- [ ] 1.8 Record the baseline revision (`6c9b582`, working tree clean, pushed to `origin/main`) in the audit report.

## 2. Inventory the repository

- [ ] 2.1 Record the tree layout: `apps/api`, `apps/mobile`, `docker/`, `docs/`, `openspec/`, root config.
- [ ] 2.2 List the npm scripts of `apps/api` and `apps/mobile`, and note that the root defines none.
- [ ] 2.3 Inventory the implemented API modules under `apps/api/src/` and state which hexagonal layers exist per module.
- [ ] 2.4 Inventory `apps/api/prisma/` (schema and migrations), naming the objects Prisma cannot model and where they are hand-written.
- [ ] 2.5 List the required environment variables from `apps/api/.env.example` by name only, plus the external services referenced.
- [ ] 2.6 Inventory `apps/mobile/src/` by feature and mark which screens are scaffold only.
- [ ] 2.7 Note the documented WebAuthn RP domain and email/SMS provider status as configured or unconfigured.
- [ ] 2.8 Confirm which backlog tasks the existing implementation already covers, and record the out-of-sequence execution as a finding.

## 3. Run the available checks

- [ ] 3.1 Start the local PostgreSQL 17 + PostGIS container and record whether it comes up and on which port.
- [ ] 3.2 Run the API unit suite (`npm test -- --runInBand`) from `apps/api` and record pass/fail counts.
- [ ] 3.3 Run the API e2e suite with `TUDOLAR_TEST_DATABASE_URL` set to the disposable `tudolar_test` database and record the result.
- [ ] 3.4 Run `npm run build` from `apps/api` and record the result.
- [ ] 3.5 Run the API ESLint and Prettier checks and record the result.
- [ ] 3.6 Run the API dependency audit and record findings without applying forced or major upgrades.
- [ ] 3.7 Run the mobile typecheck and lint commands from `apps/mobile/AGENTS.md` and record the result.

## 4. Verify the WebAuthn coverage claim

- [ ] 4.1 Locate the positive passkey registration/authentication test and confirm whether it executes or is skipped.
- [ ] 4.2 Run that test in isolation and record the exact outcome.
- [ ] 4.3 State what is and is not covered, distinguishing a real authenticator assertion from a server-side ceremony driven by a test client.

## 5. Classify failures and set the baseline

- [ ] 5.1 Classify every failure as reproducible, flaky, or environmental, each with the command and error that reproduces it.
- [ ] 5.2 Write `docs/audit/t00-baseline.md` with the inventory, the recorded commands and results, the failure classification, the WebAuthn finding, and the backlog coverage map.
- [ ] 5.3 Propose the baseline test set that must stay green, and the known-failing set that later tasks inherit.
- [ ] 5.4 Run `openspec validate t00-audit-repository-baseline --strict` and confirm it passes.
- [ ] 5.5 Present the report for the product owner's approval and record the decision.
