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
- [x] 1.8 Record the baseline revision in the audit report. The baseline is `c9b1225` with a clean working tree; `origin/main` is still at `6c9b582` because the push was denied (HTTP 403) — recorded as finding F-1.

## 2. Inventory the repository

- [x] 2.1 Record the tree layout: `apps/api`, `apps/mobile`, `docker/`, `docs/`, `openspec/`, root config. 189 tracked files; report §2.1.
- [x] 2.2 List the npm scripts of `apps/api` and `apps/mobile`, and note that the root defines none. Report §2.2.
- [x] 2.3 Inventory the implemented API modules under `apps/api/src/` and state which hexagonal layers exist per module. `auth` is fully layered; `users` has inbound/application only; report §2.3 and finding F-5.
- [x] 2.4 Inventory `apps/api/prisma/` (schema and migrations), naming the objects Prisma cannot model and where they are hand-written. 6 models, 1 migration, 6 `CHECK` constraints in the migration SQL; PostGIS is *not* there — finding F-4, report §2.4.
- [x] 2.5 List the required environment variables from `apps/api/.env.example` by name only, plus the external services referenced. Report §2.5.
- [x] 2.6 Inventory `apps/mobile/src/` by feature and mark which screens are scaffold only. `index.tsx` and `explore.tsx` are scaffold; `sign-in.tsx` is real but partial; report §2.6.
- [x] 2.7 Note the documented WebAuthn RP domain and email/SMS provider status as configured or unconfigured. RP is `localhost` (dev only) and both providers are unconfigured; report §2.7.
- [x] 2.8 Confirm which backlog tasks the existing implementation already covers, and record the out-of-sequence execution as a finding. T03 is implemented ahead of T01/T02, and parts of T06/T15 exist; report §2.8 and finding F-6.

## 3. Run the available checks

- [x] 3.1 Start the local PostgreSQL 17 + PostGIS container and record whether it comes up and on which port. `tudolar-db` healthy on host port 5433; report §3.1.
- [x] 3.2 Run the API unit suite (`npm test -- --runInBand`) from `apps/api` and record pass/fail counts. 4 suites / 6 tests passed; report §3.2.
- [x] 3.3 Run the API e2e suite with `TUDOLAR_TEST_DATABASE_URL` set to the disposable `tudolar_test` database and record the result. 2 suites / 13 tests passed; report §3.3.
- [x] 3.4 Run `npm run build` from `apps/api` and record the result. Passed (exit 0); report §3.4.
- [x] 3.5 Run the API ESLint and Prettier checks and record the result. Both clean; report §3.5.
- [x] 3.6 Run the API dependency audit and record findings without applying forced or major upgrades. Blocked by the configured registry (F-2); the public registry reports 24 advisories, none applied; report §3.6 and finding F-8.
- [x] 3.7 Run the mobile typecheck and lint commands from `apps/mobile/AGENTS.md` and record the result. `tsc --noEmit` clean; `expo lint` 0 errors / 16 warnings (F-7); report §3.7.

## 4. Verify the WebAuthn coverage claim

- [x] 4.1 Locate the positive passkey registration/authentication test and confirm whether it executes or is skipped. `test/auth.e2e-spec.ts:275`; no skip/todo/only anywhere; report §4.1.
- [x] 4.2 Run that test in isolation and record the exact outcome. Passed, 12 skipped; report §4.2.
- [x] 4.3 State what is and is not covered, distinguishing a real authenticator assertion from a server-side ceremony driven by a test client. Real signature over a software-simulated authenticator; no device, attestation, or browser binding; report §4.3 and finding F-3.

## 5. Classify failures and set the baseline

- [x] 5.1 Classify every failure as reproducible, flaky, or environmental, each with the command and error that reproduces it. No test/build/lint failures; F-1 and F-2 are environmental; report §5.
- [x] 5.2 Write `docs/audit/t00-baseline.md` with the inventory, the recorded commands and results, the failure classification, the WebAuthn finding, and the backlog coverage map. Written.
- [x] 5.3 Propose the baseline test set that must stay green, and the known-failing set that later tasks inherit. Report §6.
- [x] 5.4 Run `openspec validate t00-audit-repository-baseline --strict` and confirm it passes. Valid.
- [x] 5.5 Present the report for the product owner's approval and record the decision. Approved as-is on 2026-10-15; report §7.
