# TUDOLAR — code quality audit

Audit of the code that exists today in `apps/api/src`, `apps/api/test`, and `apps/mobile/src`,
measured against `AGENTS.md`. It covers the `auth/` and `users/` modules, the new `common/`,
`catalog/`, `offers/domain/`, `markets/`, and `subscriptions/` code, and the module scaffolding —
not the behaviour those modules are planned to grow. This is a review: **no code, test, or
configuration was changed**, and no problem is asserted that was not read from the source. Where a
concern is latent rather than live, that is said explicitly.

Two context facts shape every finding below. First, **most of the new modules provide nothing yet**:
`markets`, `sellers`, `offers`, `search`, `conversations`, `exchanges`, and `reports` are
`@Module({})` shells that freeze contracts and register nothing, and their `toXxxDto` mappers,
repository symbols, and domain errors have **no production caller**. Second, the auth slice is the
only end-to-end running code, so it carries the weight of any "does the code follow its own rules"
judgement. The scalability audit in this folder (`docs/audits/scalability.md`) already covers the
read-path cost of `paginate()`; this report does not repeat it.

---

## Verdict

The domain code is genuinely good and unusually disciplined for its age: `catalog/`, `money`,
`offers/domain/`, `markets/domain/`, and `common/` are pure, frozen, well-documented, and tested
against behaviour rather than implementation, and the auth persistence layer shows real care for
atomicity (compare-and-swap session rotation, `GREATEST` counter updates, parameterized SQL). The
weaknesses cluster in three places. **Error handling is the weakest area**: the new shared error
envelope does not actually catch every failure it claims to (a plain `Error` bypasses it entirely,
and unmapped HTTP statuses are silently rewritten), and several auth paths swallow delivery failures
with no log and no way for an operator to notice — which is the opposite of the "log useful
diagnostics" rule. **Test coverage honours the domain units but not the "everything testable has a
test beside it" requirement**: the session service, five auth adapters, both controllers, and the
sign-in form hook have no spec of their own. **Consistency across modules is the third seam**: the
new modules use `Symbol` DI tokens, explicit DTO mappers, and shared `common` errors, while `auth/`
still uses string tokens and a private error class, and `users/` — the newest module — reaches into
`auth/` for its error type instead of using `common`. None of these is a security hole; all three are
cheap to fix now and expensive once the eight empty modules are filled in against the inconsistent
pattern.

---

## Findings, ordered by severity

### Must fix

#### M1 — The shared error envelope does not cover every failure it claims to, and rewrites unmapped statuses

Area: error handling. `apps/api/src/common/errors/all-exceptions.filter.ts:46`, `:61`, `:91-95`.

- **What is wrong.** Two distinct defects live in the same filter.
  1. `@Catch(HttpException, ApplicationError)` (`:46`) matches only those two classes. Any other
     thrown value — a plain `Error`, or a domain error such as `MoneyError`
     (`catalog/money.ts:28`), `UnknownPairError` (`catalog/catalog.ts:106`), `QuoteExpiredError`
     (`offers/domain/quote.ts:46`), or `InvalidSpatialInputError`
     (`markets/domain/market-predicate.ts:50`) — is **not** caught. It falls through to Nest's
     default filter and answers with a different body (`{ statusCode, message }`), so the client
     cannot branch on `error.code` for those responses. The class docstring calls itself "the one
     filter for errors that are not already an `HttpException`" and `error-envelope.ts:5-9` calls the
     envelope "the single error shape every failure answers with"; neither is true.
  2. The response status is taken from the catalog descriptor, not the exception:
     `response.status(descriptor.status)` (`:61`), where `descriptor` comes from
     `CODE_BY_STATUS[status]` (`:91`). `CODE_BY_STATUS` (`:15-26`) is missing many statuses, so any
     `HttpException` whose status is not a key has its status **rewritten**: `503` and every unmapped
     `5xx` become `INTERNAL_ERROR`/`500`, and every unmapped `4xx` (e.g. `422`) becomes
     `BAD_REQUEST`/`400`.
- **Why it matters.** The envelope is the centrepiece of the new `common/` module and the contract a
  client branches on. As written, the "one shape for every failure" promise has a hole, and the
  status-rewrite silently changes the semantics the caller sees. Today the rewrite is **latent** —
  the only `503` producers (`email/sms` unavailable adapters) are caught inside `AuthService` before
  they reach the filter — but it will fire the first time an adapter throws a status Nest does not
  list. No test covers either case: `error-envelope.spec.ts` exercises only `ApplicationError`,
  `AuthApplicationError`, and a `ValidationPipe` rejection, and no e2e asserts a `500`.
- **Concrete fix.** Add a catch-all filter (`@Catch()` last in registration order) that wraps any
  remaining `Error` in the envelope with `INTERNAL_ERROR`, and log it. In the status mapping, prefer
  `exception.getStatus()` over the catalog status when the code came from `CODE_BY_STATUS`, or add
  the missing statuses to the map; keep the catalog as the source of the *message*, not of a status
  that can contradict the exception. Add a spec for a thrown `Error` and for a `503`, asserting the
  status is preserved and the body is the envelope.

#### M2 — Auth delivery failures are swallowed with no log, so an outage is invisible

Area: error handling. `apps/api/src/auth/application/auth.service.ts:73-77`, `:132-136`,
`:148-152`, `:186-190`, `:372-376`.

- **What is wrong.** Every call to `emailDelivery.send*` is wrapped in a bare `catch` that returns the
  "accepted" message and drops the cause:
  ```ts
  try {
    await this.emailDelivery.sendVerification(email, emailToken);
  } catch {
    return { message: acceptedRegistrationMessage };
  }
  ```
  The same pattern appears for password recovery, password-changed, password enrollment, and (for
  SMS) the phone-verification send. `AuthService` has no `Logger` and nothing else records the
  failure.
- **Why it matters.** Not disclosing whether an account exists is correct and deliberate — that is
  the point of the accepted message. But swallowing *all* errors also swallows a genuine delivery
  outage: the user is told "verification instructions will be sent" and no email is ever sent, the
  account stays `pending_email` and unverifiable, and the operator has no signal that anything
  failed. `AGENTS.md` requires "log useful diagnostics with appropriate access/retention, excluding
  credentials and tokens" — here the cause is lost entirely, not logged safely.
- **Concrete fix.** Inject or construct a `Logger` in `AuthService` and log the caught error (type and
  message, never the token or the raw email) before returning the accepted message; keep the
  response identical so nothing is disclosed. A follow-up worth considering: distinguish
  "delivery unavailable" (already a coded `SERVICE_UNAVAILABLE`) from "delivery attempted and failed"
  so the caller-facing behaviour can stay uniform while the operator signal is precise.

#### M3 — "Everything testable has its own test beside it" is honoured for the domain but not for services, adapters, controllers, and the one new hook

Area: `AGENTS.md` adherence / test quality. Rule: `AGENTS.md:28`.

- **What is wrong.** The rule names "feature file, utility, service, controller, adapter, port,
  component, and hook". Several testable units have no `<name>.spec.ts` beside them:
  - `apps/api/src/auth/application/session.service.ts` — refresh-token rotation and reuse detection,
    with no `session.service.spec.ts`.
  - `apps/api/src/auth/adapters/out/crypto/crypto-auth.adapter.ts` — `CryptoAuthAdapter` (token and
    HMAC generation) and `SystemClockAdapter`, no spec.
  - `apps/api/src/auth/adapters/out/tokens/jwt-access-token.adapter.ts` — no spec.
  - `apps/api/src/auth/adapters/out/email/email-delivery.adapter.ts` and
    `.../sms/sms-delivery.adapter.ts` — no spec.
  - `apps/api/src/auth/adapters/in/http/auth.controller.ts` and
    `apps/api/src/users/adapters/in/http/users.controller.ts` — no spec (e2e covers HTTP behaviour,
    but the rule names controllers explicitly).
  - `apps/mobile/src/features/auth/use-sign-in-form.ts` — the sign-in hook (error mapping, token
    persistence, dispatch) has no test beside it; only the *screen* is covered by
    `sign-in-tokens.spec.tsx`.
  - `apps/mobile/src/config/env.ts` — `resolveApiBaseUrl` has no spec.
  - `apps/api/src/common/pagination/cursor.ts` and `common/errors/api-error-code.ts` are exercised
    only indirectly (from `cursor-pagination.spec.ts` / `error-envelope.spec.ts`), with no spec of
    their own.
- **Why it matters.** The rule is a stated requirement, and the gaps are not random: they are exactly
  the units where the recent work added the most behaviour (session rotation, token issuance, the
  sign-in hook). `SessionService.refresh` in particular encodes reuse-detection logic that a reader
  should be able to see tested in isolation.
- **Concrete fix.** Add beside-tests for the units above, in the same style already used for
  `argon2-password-hasher.spec.ts` and `use-restore-session.spec.tsx` (mock only the external
  boundary). If a unit is genuinely covered only at the e2e layer and the team wants to waive the
  beside-test rule for it, record that decision rather than leaving it implicit.

---

### Worth fixing

#### W1 — Identity normalization is duplicated, and the persistence adapter re-implements it instead of calling the domain helper

Area: duplication / `AGENTS.md` adherence (pure helpers in the layer that owns them).
`apps/api/src/auth/domain/identity-normalization.ts:1-11`,
`apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts:93`.

- **What is wrong.** `normalizedUsername`, `normalizedEmail`, and `normalizedIdentifier` are three
  names for the identical operation `value.trim().toLowerCase()` (`identity-normalization.ts:1-11`).
  Worse, the repository does not use any of them: `findByIdentifier` normalizes inline with
  `identifier.trim().toLowerCase()` (`prisma-identity.repository.ts:93`), duplicating the domain
  rule in the infrastructure layer.
- **Why it matters.** The normalization rule is an identity invariant; if it ever changes (case
  folding, Unicode normalization), there are two places to change and one of them is an adapter the
  domain authors are unlikely to think about. `AGENTS.md:74` asks for pure helpers to live in the
  layer that owns the rule, and `AGENTS.md:76` forbids duplicating invariants across layers.
- **Concrete fix.** Keep one function (`normalizeIdentifier`) in `domain/`, have the service call it,
  and import it into the repository so `findByIdentifier` uses the same rule. If the three names are
  kept for readability, make them thin wrappers over the one implementation rather than three copies.

#### W2 — The password DTOs duplicate fields and validators

Area: duplication. `apps/api/src/auth/adapters/in/http/auth.dto.ts:24-41`, `:121-133`.

- **What is wrong.** `RegisterWithPasswordDto` and `SetPasswordDto` declare the same
  `username`/`email`/`password` fields with the same decorators, including the username regex
  `/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/` written twice (`:26` and `:122`) and the `password`
  `@Length(12, 128)` twice (`:39` and `:131`).
- **Why it matters.** A change to the username format or password length must be made in two places;
  the two DTOs will drift. `AGENTS.md:74` warns against accumulating duplicated validation.
- **Concrete fix.** Extract a shared base class (or shared property decorators) holding the
  username/email/password rules, and have both DTOs extend it.

#### W3 — DI token style is split: `auth/` uses string tokens, every new module uses `Symbol`

Area: consistency. `apps/api/src/auth/application/auth.tokens.ts:1-8` vs
`apps/api/src/common/market-context/market-context.port.ts:9`,
`apps/api/src/subscriptions/application/subscriptions.ports.ts:24`,
`apps/api/src/markets/application/markets.ports.ts:12`,
`apps/api/src/offers/application/offers.ports.ts:16-17`,
`apps/api/src/sellers/application/sellers.ports.ts:11`,
`apps/api/src/conversations/application/conversations.ports.ts:13`,
`apps/api/src/exchanges/application/exchanges.ports.ts:10`,
`apps/api/src/reports/application/reports.ports.ts:10`,
`apps/api/src/search/application/search.ports.ts:15-18`.

- **What is wrong.** `auth` injects with string constants (`'IDENTITY_REPOSITORY'`, `'CLOCK'`, …);
  every contract module added afterwards uses `Symbol('...')`. A reader who has learned one module's
  wiring does not know how the next one works, and the two styles have different failure modes
  (strings can collide silently; symbols cannot).
- **Why it matters.** This is the exact "does a reader who has seen one module know how the next one
  works" question, and the answer today is no. It also matters for the e2e test, which resolves
  adapters by string key (`auth.e2e-spec.ts:125`, `:165`).
- **Concrete fix.** Pick one convention and record it (a short note in `AGENTS.md` or the module
  docstrings). Symbols are the stronger choice; migrating `auth.tokens.ts` is a mechanical change
  that can wait until the auth module is next touched, but the decision should be explicit.

#### W4 — `users` reaches into `auth` for its error type instead of using the shared `common` error, and its DTOs alias the application types with no mapper

Area: consistency / `AGENTS.md` adherence (map at boundaries).
`apps/api/src/users/application/users.service.ts:10`,
`apps/api/src/users/adapters/in/http/current-user.dto.ts:1-5`.

- **What is wrong.** Two things.
  1. `UsersService.getCurrentUser` throws `AuthApplicationError('USER_NOT_FOUND')`
     (`users.service.ts:10`) — the newest module importing the auth module's private error class,
     even though `common/errors/application-error.ts` + `ApiErrorCode.USER_NOT_FOUND` exist for
     exactly this. It works only because `AuthApplicationErrorFilter` is registered globally.
  2. `current-user.dto.ts` defines `CurrentUserDto = CurrentUserView` and
     `AuthTokensDto = AuthTokenPair` — pure aliases with no mapping function, and `AuthTokensDto` is
     **not imported anywhere** (dead export). Every other module in the repo writes an explicit
     `toXxxDto` mapper (`market.dto.ts:17`, `seller.dto.ts:16`, `conversation.dto.ts:25`, …).
- **Why it matters.** `AGENTS.md:71` asks for a mapping boundary between application types and HTTP
  DTOs "when their responsibilities or change cycles differ"; the alias couples the wire shape to the
  application view, so a view change silently changes the API. And the error import is a needless
  cross-module dependency in the one module that was supposed to demonstrate the new `common`
  pattern.
- **Concrete fix.** `throw new ApplicationError(ApiErrorCode.USER_NOT_FOUND)`. Add a `toCurrentUserDto`
  mapper (even if it is one-to-one today) and delete the unused `AuthTokensDto`, or move it beside the
  auth DTOs where tokens actually travel.

#### W5 — Several exported helpers have no production caller yet

Area: duplication / dead code. `apps/api/src/common/pagination/cursor-pagination.ts:46-78` and the
`toXxxDto` / `XxxListDto` / repository-symbol exports across `catalog`-adjacent modules.

- **What is wrong.** `paginate()` is called only from its own spec (`cursor-pagination.spec.ts`) and
  nowhere in `src/`; `toMarketDto`, `toSellerEligibilityDto`, `toEntitlementDto`, `toAgreementDto`,
  `toReportDto`, `toSearchMatchDto`, `toConversationDto`, `toMessageDto`, and the `*ListDto` types
  likewise have no caller; the repository symbols other than `ENTITLEMENT_PORT` are never bound.
- **Why it matters.** This is **not** necessarily dead code — the module docstrings say the adapters
  land with T04/T08–T14, so these are frozen contracts by design. But it is worth stating plainly that
  a large body of "shared" API surface currently has a single consumer (its test), so nothing yet
  proves the shape is usable end to end, and `paginate`'s in-memory contract is the wrong mechanism
  for a DB-backed page (see `docs/audits/scalability.md`, H1).
- **Concrete fix.** No action required if the freeze is intended; when T09/T10 land, confirm each
  mapper has a real caller and delete any that does not, and make sure the DB adapters do keyset
  pagination rather than calling `paginate()` on a materialized list.

#### W6 — The identity repository mixes an injected clock with ambient `new Date()`

Area: error handling / testability / consistency.
`apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts:216`, `:320`, `:441`,
`:502`.

- **What is wrong.** Most port methods receive `now` from the caller (`consumeAuthChallenge`,
  `rotateSession`, `completeEmailVerification`, `verifyPhoneChallenge`), but the adapter reads the
  wall clock directly elsewhere: `expiresAt: { gt: new Date() }` in `getAuthChallenge` (`:216`),
  `data: { consumedAt: new Date() }` in `createEmailAction` (`:320`) and `createPhoneChallenge`
  (`:441`), and `updatedAt: new Date()` in `markPhoneVerified` (`:502`).
- **Why it matters.** `AGENTS.md` treats the clock as a port for a reason: behaviour that reads
  ambient time cannot be tested deterministically and can disagree with the `now` the use case
  passes. Here a challenge could be considered live by `getAuthChallenge` (`new Date()`) and expired
  by `consumeAuthChallenge` (caller's `now`) within the same request.
- **Concrete fix.** Thread `now` through the remaining port methods (`getAuthChallenge` in
  particular) so every time comparison in the adapter uses the same clock the service injected.

#### W7 — WebAuthn verification errors are swallowed and collapsed to `null`

Area: error handling. `apps/api/src/auth/adapters/out/passkeys/simple-webauthn.adapter.ts:73`, `:125`.

- **What is wrong.** `verifyRegistration` and `verifyAuthentication` wrap the library call in a bare
  `catch { return null; }`. A malformed assertion, an origin/RP mismatch, and a genuine library or
  configuration fault all become the same `null`, and nothing is logged.
- **Why it matters.** Collapsing expected verification failures to `null` is reasonable (the caller
  answers `INVALID_PASSKEY_RESPONSE`/`INVALID_CREDENTIALS` without leaking detail). But a *config*
  fault — a wrong `WEBAUTHN_ORIGINS`, a library bug — is indistinguishable from a bad credential and
  is invisible, which makes a broken passkey deployment hard to diagnose. `AGENTS.md` asks for useful
  diagnostics.
- **Concrete fix.** Log the caught error at debug/warn (message only, no assertion payload) before
  returning `null`, or narrow the catch so unexpected error types rethrow as an `INTERNAL_ERROR`.

#### W8 — No CORS, Helmet, payload-size, or timeout configuration on the API

Area: `AGENTS.md` adherence. `apps/api/src/main.ts:4-11`, `apps/api/src/app.module.ts:47-55`.

- **What is wrong.** `bootstrap()` creates the app, sets a global prefix, enables shutdown hooks, and
  listens. There is no `app.enableCors(...)`, no `helmet`, no `bodyParser`/`json({ limit })` override,
  and no request timeout. Rate limiting is present (`ThrottlerModule`, `auth.module.ts:78`) but the
  other HTTP-limit requirements are not.
- **Why it matters.** `AGENTS.md:80` is a **Requirement**: "Set HTTP limits appropriate to risk:
  request rate, payload size, and timeouts. Configure Helmet and CORS for the actual clients and
  allowed origins." The mobile client calls the API cross-origin in development and the browser-based
  e2e/probe tooling will need CORS. The default Express JSON body limit (100 kB) is a limit, but it is
  an accidental one, not a configured decision.
- **Concrete fix.** Configure Helmet, an explicit CORS origin allowlist (the same origins as
  `WEBAUTHN_ORIGINS`, which is already validated), an explicit body-size limit, and a request
  timeout. This can be its own small change rather than folded into a feature.

#### W9 — `AuthService` and `IdentityRepositoryPort` are oversized

Area: readability. `apps/api/src/auth/application/auth.service.ts` (402 lines),
`apps/api/src/auth/application/auth.ports.ts:43-137` (a 20-method port).

- **What is wrong.** `AuthService` holds registration, password login, email verification, password
  recovery/reset/enrollment, the full passkey registration and authentication ceremonies, and phone
  verification. `IdentityRepositoryPort` bundles user reads, session persistence, challenge storage,
  email tokens, and phone challenges into one interface. `SessionService` already split session
  issuance out; the same treatment is not applied to the rest.
- **Why it matters.** `AGENTS.md:74` recommends splitting by responsibility "without adding
  ceremonial layers" and warns against accumulating unrelated use-case contracts in one file. A
  400-line service and a 20-method port are where a reader has to reconstruct intent, and where a
  fake for a unit test has to stub fifteen methods it does not use (see the `as unknown as
  IdentityRepositoryPort` casts in `auth.service.spec.ts:56`).
- **Concrete fix.** Split by capability once the module is next touched — e.g. `PasswordAuthService`,
  `PasskeyAuthService`, `PhoneVerificationService` over narrower ports — keeping the controller
  delegating to them. This is a refactor, not a blocker.

#### W10 — Seven modules are empty shells

Area: consistency / `AGENTS.md` adherence. `markets/markets.module.ts:13`, `sellers/sellers.module.ts:12`,
`offers/offers.module.ts:12`, `search/search.module.ts:12`, `conversations/conversations.module.ts:10`,
`exchanges/exchanges.module.ts:10`, `reports/reports.module.ts:10`.

- **What is wrong.** Each is `@Module({})` — no imports, providers, controllers, or exports. The
  docstrings justify this ("there is nothing to provide yet; no empty or ceremonial provider is
  declared"), which is honest, but the modules themselves are the empty layer `AGENTS.md:69` warns
  against ("do not create empty or ceremonial layers").
- **Why it matters.** The tension is real but the design intent is defensible: registering the module
  now means the contracts exist and the composition root lists the context. The risk is that seven
  no-op modules read as structure that does something, and that a reviewer cannot tell a deliberate
  placeholder from an oversight.
- **Concrete fix.** Keep them, but make the placeholder status unmissable — the docstrings already do
  this well; consider a single line in `app.module.ts` or `README.md` listing the modules that are
  registered-but-empty and the task that fills each. If any module is still empty after its task
  lands, delete it.

#### W11 — Test mocks are copy-pasted across specs

Area: test quality / duplication. `apps/mobile/src/__tests__/app-shell.anonymous.spec.tsx:15-32`,
`app-shell.authenticated.spec.tsx:9-26`, `app-shell.no-template.spec.tsx:13-30`,
`theme/presentation.spec.tsx:29-46`, `features/session/use-restore-session.spec.tsx:14-34`,
`__tests__/home-tokens.spec.tsx:20-32`, `__tests__/sign-in-tokens.spec.tsx:24-32`; and
`apps/api/test/e2e/auth.e2e-spec.ts:425-430` vs `offer-terms-version-immutability.e2e-spec.ts:83-89`.

- **What is wrong.** The `expo-secure-store` in-memory mock (a `Map` plus the three async methods) is
  written out in seven mobile spec files, and the `@react-native-community/netinfo` mock in five.
  The Prisma error-shape assertion
  (`meta?.driverAdapterError?.cause?.originalCode`) is duplicated verbatim in two e2e specs.
- **Why it matters.** The repo already has a home for shared test helpers (`src/test-support/`), and
  the secure-store mock is a behaviour contract — if `expo-secure-store`'s API changes, seven files
  must change together. The rule that tests live beside what they test does not forbid a shared mock
  helper; `render-tree.ts` is exactly that.
- **Concrete fix.** Move the secure-store and netinfo mocks into `src/test-support/` (or
  `jest.setup.js`) as reusable factories, and extract the Prisma SQLSTATE assertion into a small
  `test/e2e/support/` helper.

#### W12 — `rate` and `marginPct` are unvalidated strings in the terms domain

Area: `AGENTS.md` adherence (money as exact decimals). `apps/api/src/offers/domain/offer-terms-version.ts:31-32`,
`:50-51`.

- **What is wrong.** Amounts are the exact-decimal `Money` value object, but `rate` and `marginPct`
  are typed as bare `string` (and `rate` as `string | null`), with no construction-time check that
  they are decimals. `applyMaterialEdit` copies whatever the caller passes.
- **Why it matters.** `AGENTS.md:51` requires money to be decimal and never float; the types here
  cannot be a float, so the rule is not violated, but a non-numeric string (`"abc"`, `"1,5"`) is
  accepted by the domain and only the database `NUMERIC` column (migration
  `20261017200000_.../migration.sql:26-27`) would reject it — as a raw driver error rather than a
  domain error.
- **Concrete fix.** Give `rate`/`marginPct` a validated representation (reuse the decimal pattern from
  `money.ts:36`, or a small `DecimalString` value object), so an invalid rate fails in the domain
  with a diagnosable message instead of at the database boundary.

---

### Nitpick

- **N1** — `apps/api/src/auth/application/auth.validation.ts:1-3` is a whole file for a three-line
  `hasString` used once (`auth.service.ts:270`). Its name also hides intent: at the call site it is
  really "the stored challenge context must carry a userId and a displayName". Fold it into the
  service or name it for what it checks.
- **N2** — `apps/api/src/auth/application/auth.ports.ts:12` defines
  `export type PasswordAccount = AuthenticatedUser`, an alias that adds a name without adding meaning.
- **N3** — `apps/api/src/auth/domain/identity-normalization.ts:1-11`: three functions that are the same
  `trim().toLowerCase()`; `normalizedIdentifier` duplicates the other two (see W1).
- **N4** — `apps/api/src/auth/adapters/in/http/auth.dto.ts`: the `import { Transform } from
  'class-transformer'` (`:1`) and the `trimStringTransform` function (`:3-13`) sit *between* the two
  import blocks, so the `class-validator` import only appears at `:14`. Move all imports together.
- **N5** — `apps/api/src/catalog/money.spec.ts:45-51`: a `try/catch` around a call that is already
  asserted to throw on `:43`, tracking a `truncated` variable that can only ever be `undefined`. The
  `expect(() => …).toThrow(MoneyError)` above it already covers the behaviour.
- **N6** — `apps/api/src/offers/domain/offer-terms-version.spec.ts:110-120` asserts the *absence of
  exported names* matching `/update|replace|overwrite/i` via `jest.requireActual`. It tests the
  module's naming, not its behaviour: an update path named `mutate` or `setTerms` would pass. The
  insert-only rule is better proven by the DB-level e2e
  (`test/e2e/offer-terms-version-immutability.e2e-spec.ts`), which already exists — consider replacing
  this spec with a behavioural one (e.g. that the returned offer and version are fresh objects and the
  inputs are untouched, which the neighbouring tests already do).
- **N7** — `apps/api/src/offers/domain/quote.spec.ts:41-48` and
  `apps/api/src/offers/domain/agreement-terms.spec.ts:45-49` assert exact `Object.keys(...)` sets.
  These are contract locks (the ADR says the type carries no reference rate), but they fail on any
  legitimate added field, so they read as shape tests rather than behaviour tests. Consider asserting
  the specific forbidden fields only (as `quote.spec.ts:49-51` already does) and dropping the full
  key-list equality.
- **N8** — `apps/mobile/src/__tests__/sign-in-tokens.spec.tsx:57-61` and
  `home-tokens.spec.tsx:54-57` assert `collectClassNames().join(' ').toContain('bg-primary')` — a
  presence check over the whole tree, which would pass if `bg-primary` appeared on any unrelated node.
  The "no literal colour" guard (`sign-in-tokens.spec.tsx:40`) only matches hex, so `rgb(...)` or a
  named colour would slip through.
- **N9** — `apps/api/src/common/errors/error-envelope.ts:51-56` re-implements the `x-request-id`
  header extraction (array-vs-string handling) that `request-id.middleware.ts:13-16` already does.
  Factor the read into one place.
- **N10** — `apps/api/src/markets/adapters/out/postgis-offer-query.ts:57`'s `UNSAFE_FRAGMENT_TEXT =
  /['";\\]|--/` does not cover `/*` (block-comment opener) or a newline. The fragment is built from a
  frozen identifier allowlist, so this is defense-in-depth only and low risk; if the check is meant to
  be a real guard, make it an allowlist of expected characters rather than a denylist.
- **N11** — Global providers are split across modules: `AppModule` registers `APP_PIPE` and
  `APP_FILTER` (`app.module.ts:47-60`) while `AuthModule` registers `APP_GUARD` (throttler and JWT) and
  another `APP_FILTER` (`auth.module.ts:178-180`). It works, but a reader looking for the global HTTP
  policy will not find it in one place.
- **N12** — `apps/api/src/auth/adapters/in/http/auth.decorators.ts:20` returns `request.user` without
  checking it is present; on a `@Public()` route that also used `@CurrentPrincipal()` this would be
  `undefined` rather than a clear error.

---

## What the code does well

These are worth copying into the modules that are still empty.

- **The catalog and money domain are exemplary.** `catalog/catalog.ts` and `catalog/money.ts` are pure,
  frozen, closed allowlists with no infrastructure imports. `Money` holds integer minor units as
  `bigint` so no binary float can reach a monetary amount, separates exact construction (`Money.of`)
  from the single permitted rounding step (`Money.round`), and refuses to silently truncate.
  `money.spec.ts` proves the float path is rejected, the rounding is half-up and idempotent, and mixed
  assets cannot be added — behaviour, not implementation.
- **The PostGIS query construction is the model the other adapters should follow.**
  `markets/domain/market-predicate.ts` builds the `WHERE` fragment so the market predicate and the
  proximity predicate can only ever appear together, values are bound as `$n` parameters, and
  identifiers/SRID come from a frozen allowlist; `adapters/out/postgis-offer-query.ts` renders that
  fragment through `Prisma.sql`/`Prisma.raw` with a defense-in-depth text check, and the specs assert
  that no value appears in the SQL text and that an out-of-range proximity is rejected before a query
  is built. This is `AGENTS.md:50` done properly.
- **Cursor pagination is well designed at the contract level.** `common/pagination/cursor.ts` encodes
  an opaque base64url cursor and re-validates it on the way in (a tampered cursor is a coded `400`,
  not a crash), `resolvePageLimit` caps the page, and `cursor-pagination.spec.ts` pages through the
  whole set asserting no repeats and a stable tie-break. (Its in-memory cost is the separate concern
  covered in the scalability audit.)
- **The error envelope's *design* is sound even where its coverage is not.** `ApiErrorCode` is a
  closed enum, `ERROR_CATALOG` is a single code→status/message mapping, messages never carry SQL or a
  stack trace, and the request id travels with the envelope for correlation. `error-envelope.spec.ts`
  asserts the response has exactly `{ error, requestId }` and that the message does not contain the
  exception name — the right shape of test.
- **Login equalizes timing deliberately.** `auth.service.ts:86-94` hashes the supplied password even
  when no account (or no password hash) exists, so a missing account and a wrong password take the
  same path. This is a subtle correctness property that is easy to omit and worth keeping.
- **The auth persistence layer is careful about atomicity and raw SQL.** Session rotation is a
  compare-and-swap (`rotateSession`, `prisma-identity.repository.ts:534-585`) with the losing racer
  treated as replay and the whole token family revoked; challenge consumption and email-token
  consumption use `updateMany` guards; the signature counter is updated with `GREATEST` so it cannot
  roll back. Raw SQL is kept to the cases Prisma cannot express and is always parameterized, exactly
  as `AGENTS.md:47` asks.
- **The migrations enforce invariants in the database, and the tests check the database.**
  `CHECK` constraints, partial unique indexes via the `partialIndexes` preview feature, and the
  insert-only trigger on `offer_terms_versions` are hand-written and then verified by e2e tests that
  assert the trigger exists and that an `UPDATE` fails with SQLSTATE `23514` — the rule is enforced
  where it belongs, and the test proves it there.
- **Startup validation is thorough and fails loudly.** `config/env.validation.ts` verifies that the JWT
  public key matches the private key, that the key is RSA ≥ 2048 bits, that `DATABASE_URL` is a
  PostgreSQL URL, that the WebAuthn origin allowlist is non-empty and not `*`, that the pepper is long
  enough, and that test-only adapters are refused outside `NODE_ENV=test` — without printing any
  secret. `postgis-extension.ts` turns a missing extension into one actionable startup error.
- **Several specs test behaviour and mock only the boundary.** `use-restore-session.spec.tsx` mocks
  exactly the secure store and the network call, leaving the hook, the reducer, and the store real;
  `market-context.guard.spec.ts` covers missing, blank, unknown, valid, and market-free routes; the
  `app-shell.*` specs assert that no token, password hash, or starter-template text is ever rendered.
  `Argon2PasswordHasher` treats a malformed stored hash as an invalid password rather than throwing —
  a small, correct decision with a test beside it.
- **The module docstrings are consistently excellent.** Nearly every new file names the ADR it
  implements and the rule it upholds (e.g. `offers/domain/offer-terms-version.ts:4-18`,
  `search/application/search.ports.ts:33-42`). A reader landing anywhere in the new code is told why
  it exists; the empty-module docstrings even explain why there is no provider. This is the strongest
  readability asset in the repository and the thing most likely to keep the empty modules coherent as
  they are filled in.
