# T00 — Repository audit and baseline

This is the verified statement of what the TUDOLAR repository actually does today, recorded
against a fixed revision, so that T01–T20 build on evidence instead of assumptions. It is an
audit: nothing here was repaired, and every failure is classified rather than fixed.

Source: Notion T00 — [Auditar el repositorio y fijar una línea base](https://app.notion.com/p/d358155c3492473581e0c058e08e3b36)

## 1. Baseline revision

| Item | Value |
| --- | --- |
| Branch | `main` |
| Baseline commit | `c9b1225` — "Sync the T00 change artifacts with the committed baseline." |
| Previous commit | `6c9b582` — "Add the T00 audit change proposal." |
| Working tree | Clean (`git status --porcelain --untracked-files=all` produced no output) |
| Published to `origin/main` | **No** — see F-1 |

Pre-audit state, as recorded before the baseline was fixed (`git log --oneline -5`):

```
6c9b582 Add the T00 audit change proposal.
2bb5b62 Document the Prisma, RTK Query, and OpenSpec stack.
f918287 Add the local PostgreSQL and PostGIS environment.
e60946a Add the Expo mobile client scaffold.
26c39ea Replace node-pg-migrate with Prisma as the single persistence layer.
```

The baseline commit added the two pre-apply-sync edits to
`openspec/changes/t00-audit-repository-baseline/{design.md,tasks.md}`. Everything after this
section was measured at `c9b1225`.

Toolchain observed: Node.js `v24.13.1`, npm `11.8.0`, Docker Compose `v5.1.4`,
PostgreSQL `17.5`, PostGIS `3.5.2`.

## 2. Inventory

### 2.1 Tree layout

```
tudolarapp/
├── AGENTS.md                  engineering conventions (authority on architecture/DB/security)
├── README.md                  product context and implementation status
├── LICENSE
├── docker-compose.yml         local PostgreSQL 17 + PostGIS 3.5
├── docker/initdb/             cluster bootstrap SQL (creates tudolar_test, installs PostGIS)
├── apps/
│   ├── api/                   NestJS 11 + Prisma 7 API
│   └── mobile/                Expo ~57 React Native client
├── docs/
│   ├── architecture.md
│   └── flows/{authentication,search-and-contact,seller-offer-lifecycle}.md
├── openspec/
│   ├── config.yaml            planning context and rules
│   ├── specs/                 empty (only .gitkeep)
│   └── changes/
│       ├── archive/           empty (only .gitkeep)
│       └── t00-audit-repository-baseline/
└── .devin/                    skills, workflows, notion-sdd.json, plans
```

189 files are tracked by git. The root holds **no** `package.json`, no workspace
configuration, and no lockfile: the two applications are independent packages, each with its own
`package-lock.json`.

### 2.2 npm scripts

`apps/api`:

| Script | Command |
| --- | --- |
| `build` | `nest build` |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` |
| `start` / `start:dev` / `start:debug` / `start:prod` | `nest start…` / `node dist/main` |
| `postinstall` | `prisma generate` |
| `prisma:generate` | `prisma generate` |
| `db:migrate:dev` / `db:migrate:deploy` / `db:migrate:status` | `prisma migrate …` |
| `db:studio` | `prisma studio` |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts"` |
| `test` | `node --experimental-vm-modules node_modules/jest/bin/jest.js` |
| `test:watch` / `test:cov` / `test:debug` | jest variants |
| `test:e2e` | `node ./test/run-e2e.cjs` |

`apps/mobile`:

| Script | Command |
| --- | --- |
| `start` | `expo start` |
| `android` / `ios` / `web` | `expo start --android` / `--ios` / `--web` |
| `lint` | `expo lint` |
| `reset-project` | `node ./scripts/reset-project.js` |

The root defines none, so every command below states its working directory.

### 2.3 API modules and hexagonal layers

`apps/api/src/` holds 35 tracked TypeScript files (the generated Prisma client is git-ignored).
Two business modules exist, plus two infrastructure modules.

**`auth/`** — the only module with the full layered shape:

| Layer | Contents |
| --- | --- |
| `domain/` | `user.ts`, `identity-normalization.ts` |
| `application/` | `auth.service.ts`, `session.service.ts`, `auth.commands.ts`, `auth.errors.ts`, `auth.models.ts`, `auth.ports.ts`, `auth.tokens.ts`, `auth.validation.ts` |
| `adapters/in/http/` | `auth.controller.ts`, `auth.dto.ts`, `auth.decorators.ts`, `jwt-auth.guard.ts`, `jwt.strategy.ts`, `auth-application-error.filter.ts` |
| `adapters/out/` | `crypto/`, `email/`, `passkeys/`, `password/`, `persistence/`, `sms/`, `tokens/` |

**`users/`** — inbound + application only: `users.controller.ts`, `current-user.dto.ts`,
`users.service.ts`, `current-user.view.ts`, `users.module.ts`. There is no domain code and no
outbound adapter; persistence is reached through the auth module's repository.

**`config/`** — `env.validation.ts` (+ spec), the startup validator.
**`database/`** — `database.module.ts`, `prisma.service.ts`.

See F-5 for the empty layer directories that exist on disk.

### 2.4 Prisma schema and migrations

- `prisma/schema.prisma` declares 6 models: `User`, `PasskeyCredential`, `AuthSession`,
  `AuthChallenge`, `EmailActionToken`, `PhoneVerificationChallenge`.
- One migration exists: `prisma/migrations/20261015150121_init_identity_schema/migration.sql`.
- `prisma.config.ts` resolves `DATABASE_URL` from the environment, deliberately without
  `env('DATABASE_URL')` so that `prisma generate` still works before a `.env` exists.
- The generated client lives at `src/generated/prisma` and is **not** tracked by git; the
  `postinstall` hook regenerates it, and the e2e runner regenerates it explicitly.
- `prisma` is the single migration runner. `node-pg-migrate` was removed.

Objects Prisma cannot model, and where they actually live:

| Object | Declared in `schema.prisma` as hand-written in the migration | Actually located in |
| --- | --- | --- |
| 6 `CHECK` constraints | yes | the migration SQL (confirmed) |
| PostGIS extension | yes | **`docker/initdb/01-create-databases.sql`** (see F-4) |

Partial unique indexes on `users` (`username_normalized`, `email_normalized`, `phone_e164`) are
expressed in the schema through the `partialIndexes` preview feature.

The local cluster has the migration applied to both `tudolar` and `tudolar_test`, with
PostGIS `3.5.2` installed in each.

### 2.5 Environment variables and external services

Required by `apps/api/src/config/env.validation.ts` (names only):

`DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`,
`WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGINS`, `PHONE_OTP_PEPPER`.

Optional / defaulted: `NODE_ENV`, `PORT`, `JWT_ACCESS_TTL_SECONDS` (600),
`JWT_REFRESH_TTL_SECONDS` (2592000), `EMAIL_DELIVERY_MODE` (`unavailable`),
`SMS_DELIVERY_MODE` (`unavailable`).

The validator enforces more than presence: an RSA key pair of at least 2048 bits whose public
half matches the private half, a PostgreSQL-protocol `DATABASE_URL`, a non-empty WebAuthn origin
allowlist that rejects `*`, a pepper of at least 32 characters, and a refusal to start in
production with `WEBAUTHN_RP_ID=localhost` or with an unavailable delivery adapter.

External services referenced: PostgreSQL/PostGIS (via Docker Compose) and a WebAuthn relying
party. No email or SMS provider is integrated — only a port plus unavailable/in-memory adapters.

### 2.6 Mobile client inventory

`apps/mobile/src/` holds 53 tracked files.

| Area | Path | State |
| --- | --- | --- |
| Routes | `src/app/_layout.tsx` | Real: providers (Redux, gluestack, SafeArea, gesture handler), splash, session restore |
| Routes | `src/app/index.tsx` | **Scaffold**: "Welcome to Expo" template screen |
| Routes | `src/app/explore.tsx` | **Scaffold**: Expo template content |
| Routes | `src/app/sign-in.tsx` | Real but partial: renders `SignInForm` |
| Feature: auth | `src/features/auth/` | Partial: password sign-in only, via React Hook Form + RTK Query |
| Feature: session | `src/features/session/` | Real: Redux slice, `expo-secure-store` refresh-token persistence, session restore |
| Services | `src/services/api.ts` | Real: one RTK Query slice (`health`, `currentUser`, `signInWithPassword`, `registerWithPassword`, `refreshSession`, `logout`) |
| UI kit | `src/components/ui/**` | gluestack-ui generated components |
| Infra | `src/store/`, `src/config/env.ts`, `src/hooks/`, `src/constants/` | Real |

Only the refresh token is persisted, and only through `expo-secure-store`; the access token stays
in memory. No market selection, registration, recovery, or logout UI exists. The sign-in tab is
explicitly marked a scaffold placeholder in `src/components/app-tabs.tsx`.

`app.json` sets `expo.extra.apiBaseUrl` to `http://localhost:3000` and enables
`expo-secure-store` and `typedRoutes`.

### 2.7 WebAuthn RP domain and email/SMS provider status

| Item | Status |
| --- | --- |
| `WEBAUTHN_RP_ID` | `localhost` — **development only**; `env.validation.ts` refuses to start in production with it |
| `WEBAUTHN_RP_NAME` | `TUDOLAR` |
| `WEBAUTHN_ORIGINS` | `http://localhost:3000`, a single explicit origin; `*` is rejected |
| iOS `apple-app-site-association` | Not present |
| Android `assetlinks.json` | Not present |
| Production RP domain / Bundle ID / application ID | Undecided |
| Email delivery | **Unconfigured** — `EMAIL_DELIVERY_MODE=unavailable`; the in-memory adapter only activates under `NODE_ENV=test` |
| SMS delivery | **Unconfigured** — `SMS_DELIVERY_MODE=unavailable`; same rule |

Native mobile passkey sign-in is therefore blocked on production RP/domain and app association
work, which is a T01/T06 decision, not an implementation gap in this audit.

### 2.8 Backlog coverage map

The Notion backlog is a strictly sequential chain: a task is eligible only when its predecessor
is `Done`. The repository does not match that order.

| Task | Backlog intent | State in the repository |
| --- | --- | --- |
| T00 | Audit and fix a baseline | This change (in progress) |
| T01 | Close product/MVP scope decisions | **Not done.** Market polygon, assets, payment methods, seller requirements, subscription plans, and the RTK Query vs TanStack Query choice are all still open |
| T02 | Publish technical decisions and API contracts | **Not done.** No ADRs exist |
| T03 | Integrate Prisma without breaking persistence | **Already implemented, out of sequence.** Prisma 7 owns the schema and migrations, 6 models are mapped, and persistence sits behind ports |
| T04 | Model geographic markets and prepare Ciudad Ojeda | Not implemented. No market model; PostGIS is installed but unused |
| T05 | Market isolation and authorization | Not implemented. Auth is global; no market context exists |
| T06 | Close auth and verification gaps | **Partially implemented.** The auth slice is complete and its 11 e2e tests pass, but production email/SMS adapters and mobile passkey associations are missing |
| T07–T14 | Seller profile, subscriptions, offers, search, chat, exchanges, trust & safety | Not implemented |
| T15 | Bring the existing Stitch design into the mobile app | **Partially implemented, out of sequence.** The Expo + expo-router + gluestack + RTK Query + React Hook Form base exists, but there is no evidence the Stitch design was consulted, and two of three tab screens are template placeholders |
| T16 | Mobile auth and market selection | **Partially implemented.** Password sign-in and session restore exist; registration, recovery, refresh, logout, and market selection do not |
| T17–T20 | Seller experience, buyer search, chat/exchange, quality gate | Not implemented |

The backlog's "known starting state" is stale on two counts: it says `node-pg-migrate` owns the
migrations (Prisma does) and that no mobile client exists (one does). See F-6.

## 3. Commands run and results

Every command below was executed from the stated directory at revision `c9b1225`.

### 3.1 Local database

```bash
# from the repository root
docker compose up -d
```

```
Container tudolar-db Running
```

It was already up, and `docker compose ps` confirmed:

```
NAME         IMAGE                    STATUS                 PORTS
tudolar-db   postgis/postgis:17-3.5   Up 3 hours (healthy)   0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp
```

**Result: PASS.** The container is healthy and publishes on host port **5433** (mapped to 5432
inside the container; 5433 avoids colliding with other local PostgreSQL instances). Both
`tudolar` and `tudolar_test` respond, with PostGIS `3.5.2` installed.

### 3.2 API unit suite

```bash
# from apps/api
npm test -- --runInBand
```

```
Test Suites: 4 passed, 4 total
Tests:       6 passed, 6 total
Time:        8.649 s
```

**Result: PASS** (exit 0).

### 3.3 API e2e suite

```bash
# from apps/api
TUDOLAR_TEST_DATABASE_URL=postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar_test npm run test:e2e -- --runInBand
```

```
✔ Generated Prisma Client (7.10.0) to ./src/generated/prisma in 50ms
Datasource "db": PostgreSQL database "tudolar_test", schema "public" at "127.0.0.1:5433"
1 migration found in prisma/migrations
No pending migrations to apply.
PASS test/auth.e2e-spec.ts (17.523 s)
PASS test/app.e2e-spec.ts

Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

**Result: PASS** (exit 0). The runner regenerated the client, found no pending migrations, and
ran both suites against the disposable `tudolar_test` database.

### 3.4 API build

```bash
# from apps/api
npm run build
```

**Result: PASS** (exit 0). `dist/` was produced.

### 3.5 API lint and format checks

```bash
# from apps/api
npm run lint
npx prettier --check "src/**/*.ts" "test/**/*.ts"
```

```
lint exit=0
Checking formatting...
All matched files use Prettier code style!
```

**Result: PASS** (both exit 0). No ESLint errors or warnings, and no formatting drift.

### 3.6 API dependency audit

```bash
# from apps/api
npm audit
```

```
npm warn audit request to https://artifactory.imt.m4s.intcx.net/.../security/advisories/bulk failed,
  reason: getaddrinfo ENOTFOUND artifactory.imt.m4s.intcx.net
npm error audit endpoint returned an error
```

**Result: FAILED — environmental** (exit 1). The machine's `~/.npmrc` points the default registry
at an internal Artifactory host that does not resolve on this network. See F-2.

Re-run against the public registry to obtain a real result, without changing any configuration:

```bash
# from apps/api
npm audit --registry=https://registry.npmjs.org
```

```
24 vulnerabilities (20 moderate, 4 high)
```

Notable advisories, none of which is applied here:

| Package | Severity | Path | Available fix |
| --- | --- | --- | --- |
| `deepmerge-ts <8.0.0` | high | `prisma` → `@prisma/config` | `npm audit fix --force` (would downgrade `prisma` to 6.19.3 — breaking) |
| `mysql2 <=3.23.0` | high | `prisma` | `npm audit fix --force` (breaking) |
| `sprintf-js` | moderate | `ts-jest` → `@istanbuljs/load-nyc-config` → `argparse` | `npm audit fix --force` (breaking) |

Every available fix is a breaking change, so per the task instruction **no upgrade was applied**.

### 3.7 Mobile typecheck and lint

```bash
# from apps/mobile
npx tsc --noEmit
npx expo lint
```

```
tsc exit=0
✖ 16 problems (0 errors, 16 warnings)
```

**Result: PASS with warnings** (both exit 0). All 16 warnings are `import/no-duplicates` on
`@gluestack-ui/utils/nativewind-utils` inside generated gluestack UI components; 8 are
auto-fixable. See F-7.

For completeness, the mobile dependency audit (`npm audit --registry=https://registry.npmjs.org`
from `apps/mobile`) reports **25 vulnerabilities (11 moderate, 14 high)**, again all requiring
breaking upgrades.

## 4. WebAuthn coverage finding

**The claim to verify:** the backlog's starting state said a positive WebAuthn
registration/authentication test had not been verified.

**4.1 — Location and execution.** The test is
`apps/api/test/auth.e2e-spec.ts:275`:

```ts
it('registers and authenticates a passkey using a real WebAuthn assertion', async () => {
```

A repository-wide search for `.skip`, `.todo`, `xit(`, `xdescribe(`, `it.only`, and
`describe.only` across `apps/api/src` and `apps/api/test` returned **no matches**. The test
executes as part of the suite; nothing is skipped or focused.

**4.2 — Isolated run.**

```bash
# from apps/api
TUDOLAR_TEST_DATABASE_URL=postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar_test \
  npm run test:e2e -- --runInBand -t 'registers and authenticates a passkey using a real WebAuthn assertion'
```

```
Test Suites: 1 skipped, 1 passed, 1 of 2 total
Tests:       12 skipped, 1 passed, 13 total
Time:        2.977 s
```

**Result: PASS** (exit 0). The test passes in isolation, deterministically.

**4.3 — What is actually covered.** The test is real cryptography over real HTTP, but it is not a
real authenticator. Being precise matters, because the repository currently describes it in two
contradictory ways (F-3).

What **is** exercised:

- The full server-side ceremony through the HTTP API: registration options and authentication
  options endpoints, server-generated challenges, the verify endpoints, and the session issuance
  that follows.
- Genuine signature verification. `SimpleWebAuthnAdapter` calls
  `verifyRegistrationResponse`/`verifyAuthenticationResponse` with `expectedChallenge`,
  `expectedOrigin` (the configured allowlist), `expectedRPID`, and `requireUserVerification:
  true`, and the test's assertion carries a valid ECDSA P-256 signature over the authenticator
  data, so verification passes on its merits rather than by short-circuit.
- Challenge one-time consumption, credential persistence, and the resulting `authMethods`
  (`['passkey']`) and user identity in `GET /users/me`.
- Rejection paths in sibling tests: malformed registration data, unknown discoverable
  credentials, and a negative signature counter rejected at the database `CHECK` constraint.

What is **not** exercised:

- **A real authenticator.** `test/support/webauthn-test-client.ts` generates an in-process
  P-256 key pair with `node:crypto` and hand-assembles `authenticatorData` (RP ID hash, flags,
  counter, COSE key) and the attestation object. There is no platform or roaming authenticator,
  no hardware-backed key, and no device.
- **Attestation.** Registration uses `attestationType: 'none'` with an empty `attStmt`, so no
  attestation statement is produced or trusted.
- **Browser or OS origin binding.** `clientDataJSON` is constructed by the test client, so
  WebAuthn's real client-side origin and user-consent guarantees are simulated rather than
  observed.
- **Mobile passkeys.** No `apple-app-site-association` or `assetlinks.json`, no production RP
  domain, and no mobile passkey code path — consistent with §2.7.

**Verdict:** the positive ceremony is genuinely implemented and genuinely verified server-side,
against a **software-simulated** authenticator. A real device-level authenticator assertion
remains unverified. `docs/architecture.md`'s claim that e2e coverage includes "a real WebAuthn
assertion" is misleading as written, while `docs/flows/authentication.md` and
`apps/api/README.md` correctly state that a valid real authenticator assertion is not yet
exercised.

## 5. Failure classification

No test, build, lint, or typecheck failure was observed. Two commands failed, both for reasons
outside the repository.

| ID | Finding | Class | Reproduce with |
| --- | --- | --- | --- |
| F-1 | Baseline commit is not published. `git push origin main` was rejected: `Permission to lyondeveloper/tudolarapp.git denied to jrinconimproving` (HTTP 403). The commit `c9b1225` exists locally only. | **Environmental** (credentials) | `git push origin main` from the repository root |
| F-2 | `npm audit` cannot reach the configured registry. `~/.npmrc` sets `registry` to `https://artifactory.imt.m4s.intcx.net/...`, which does not resolve on this network. | **Environmental** (network/registry) | `npm audit` from `apps/api` |
| F-3 | Documentation contradicts itself on WebAuthn coverage: `docs/architecture.md` claims a real assertion is covered; `docs/flows/authentication.md` and `apps/api/README.md` say it is not. §4 shows the latter two are correct. | Reproducible (documentation) | Compare the three files with §4 |
| F-4 | `prisma/schema.prisma` states the PostGIS extension is hand-appended to the generated migration SQL. It is not: no `CREATE EXTENSION` appears anywhere under `prisma/migrations/`. PostGIS is installed by `docker/initdb/01-create-databases.sql`. A database created without that init script would lack PostGIS, and the next `prisma migrate dev` cannot add it. | Reproducible (documentation/setup gap) | `grep -rn "CREATE EXTENSION" apps/api/prisma/migrations/` |
| F-5 | 8 empty, untracked hexagonal directories exist on disk (`auth/adapters/in/http/dto`, `auth/application/{ports,use-cases}`, `users/{domain,adapters/out/persistence,adapters/in/http/dto,application/ports,application/use-cases}`). `AGENTS.md` asks not to create empty or ceremonial layers; because git does not track empty directories, a fresh clone does not have them, so the on-disk shape differs from the committed one. | Reproducible (structure) | `find apps/api/src -type d -empty` |
| F-6 | The backlog was executed out of sequence: T03 is effectively implemented while T01 and T02 are not, and parts of T06 and T15 exist. The backlog forbids starting a task before its predecessor is `Done`, and the "known starting state" is stale. | Reproducible (process) | §2.8 |
| F-7 | Mobile lint reports 16 `import/no-duplicates` warnings in generated gluestack UI components. | Reproducible (warnings only) | `npx expo lint` from `apps/mobile` |
| F-8 | Dependency advisories: 24 in `apps/api` (20 moderate, 4 high) and 25 in `apps/mobile` (11 moderate, 14 high). Every available fix is a breaking change. | Reproducible (recorded, not applied) | `npm audit --registry=https://registry.npmjs.org` from each app |

No flaky result was observed: the unit suite, the e2e suite, and the isolated passkey test each
produced the same result on repeat runs.

## 6. Baseline test set

**Must stay green.** These are the commands a later change must keep passing; all of them pass
today at `c9b1225`.

| # | Command | Working directory | Expected |
| --- | --- | --- | --- |
| 1 | `npm test -- --runInBand` | `apps/api` | 4 suites / 6 tests passed |
| 2 | `TUDOLAR_TEST_DATABASE_URL=postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar_test npm run test:e2e -- --runInBand` | `apps/api` | 2 suites / 13 tests passed |
| 3 | `npm run build` | `apps/api` | exit 0 |
| 4 | `npm run lint` | `apps/api` | exit 0, no output |
| 5 | `npx prettier --check "src/**/*.ts" "test/**/*.ts"` | `apps/api` | "All matched files use Prettier code style!" |
| 6 | `npx tsc --noEmit` | `apps/mobile` | exit 0 |
| 7 | `npx expo lint` | `apps/mobile` | exit 0 (16 warnings tolerated) |

Only command 2 needs the local container from §3.1 (`docker compose up -d` at the root), because
it applies migrations and exercises HTTP against PostgreSQL. No command needs an `apps/api/.env`,
which does not exist in this checkout: the unit specs build their own environment and mock their
ports, the build and lint steps read no runtime configuration, and `test/run-e2e.cjs` plus
`test/setup-e2e.cjs` supply their own database URL, RSA key pair, pepper, and delivery modes
while validating that the target database is local and ends in `_test`.

**Known-failing set inherited by later tasks.** Nothing is red. The following are inherited as
non-blocking debt rather than failures:

- F-1 and F-2 are environmental and must be resolved outside the repository (GitHub write access
  for the pushing account; a resolvable npm registry or an explicit `--registry` override) before
  dependency auditing or publishing can be considered reliable.
- F-7: 16 mobile lint warnings. Tolerated as a baseline; a later mobile change should not
  increase the count.
- F-8: dependency advisories are recorded and deliberately not applied, because every fix is a
  breaking change. They are input to T02/T20, not work for this audit.
- Device-level passkey coverage (§4) stays unverified until a production RP domain and
  iOS/Android associations exist, which T01 decides and T06 executes.
- F-3, F-4, F-5, and F-6 are documentation/process defects. They are recorded, not repaired, per
  this change's no-fix boundary.

## 7. Decision

**Approved by the product owner on 2026-10-15.** This report is the reference for the remaining
backlog, and the §6 test set is accepted as the set that must stay green.

Accepted as recorded, with no repairs: the audit's findings (F-1 to F-8) pass to their owning
tasks. Specifically, the environmental blockers F-1 (GitHub write access) and F-2 (resolvable npm
registry) must be resolved outside the repository before publishing or dependency auditing can be
relied on, and the device-level passkey gap in §4 remains a T01/T06 item.

T01 is unblocked.

## 8. Addendum — what the mobile checks missed

Added while implementing `openspec/changes/mobile-auth-first-screen`. T00 verified `apps/mobile`
with `tsc --noEmit` and `expo lint` only, and **both passed while the app could not run at all**.
This section records the two defects that finding hid, because it is the concrete justification
for the mobile test runner that change introduces.

Both defects were in the baseline revision `c9b1225`; neither was introduced by the change.

### F-9 — the app could not bundle: the `@/assets/*` alias existed only for TypeScript

`apps/mobile/tsconfig.json` declares `"@/assets/*": ["./assets/*"]`, but
`apps/mobile/babel.config.js` aliased only `@` → `./src`. TypeScript therefore accepted
`@/assets/images/...` while Metro resolved it into `src/assets/...`, which does not exist.
`tsc --noEmit` and `expo lint` both passed.

Reproduce:

```bash
# from apps/mobile, with Metro running
npx expo start
```

```
iOS Bundling failed 17230ms node_modules/expo-router/entry.js (2320 modules)
Unable to resolve "../assets/images/tutorial-web.png" from "src/app/explore.tsx"
```

Fixed by adding `'@/assets': './assets'` ahead of `'@'` in the resolver alias, because the
resolver applies the first alias that matches.

### F-10 — the root layout crashed at render: the session hook ran above its own provider

`apps/mobile/src/app/_layout.tsx` called `useRestoreSession()` in the layout body while rendering
`<Provider store={store}>` as a descendant. React context flows downward, so the hook's
`useAppDispatch()` found no store.

Reproduce: any render of the root layout.

```
ERROR  [Error: could not find react-redux context value; please ensure the component is wrapped in a <Provider>]
Code: use-restore-session.ts
  useRestoreSession (src/features/session/use-restore-session.ts:17:34)
  TabLayout (src/app/_layout.tsx:21:20)
```

Fixed by moving the call into a child component rendered inside the provider.

### Consequence for §3.7 and §6

The §3.7 mobile result ("typecheck clean, lint 0 errors / 16 warnings") remains accurate, but it
was not evidence that the app worked, and §6's baseline test set did not cover it either. §6 gains
`npm test` from `apps/mobile`; at the time of writing it runs 5 suites and 11 tests, all passing,
and a render test fails on both F-9's and F-10's class of defect.

### Update to F-2

F-2's dependency-audit half is now resolved inside the repository: `.npmrc` files at the root and
in both applications pin `registry=https://registry.npmjs.org/`, so `npm audit` runs without a
`--registry` override and no longer inherits the unreachable machine-level mirror. F-2's other
half — F-1's GitHub write access — is unchanged and still open.
