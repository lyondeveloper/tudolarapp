# TUDOLAR Engineering Guidelines

These guidelines shape the app and API. **Requirement** means a rule that must be followed; **Recommendation** means a preferred practice unless there is a documented reason to differ. They are not exhaustive. Respect tools and decisions already adopted by the repository; do not add dependencies without a need.

## Product context

TUDOLAR is a mobile P2P marketplace for discovering and coordinating in-person exchanges of cash and currencies (USD cash, USDT, and Venezuelan bolivars). The initial market is Ciudad Ojeda; validate it before expanding. Buyers use the service for free; the proposed revenue model is seller subscriptions, not per-exchange commissions. Zelle was removed from the MVP by product decision to avoid unresolved legal terms; the MVP catalog is five directional pairs (VES → USDT, VES in a bank account → physical VES cash, VES → USD cash, USDT → VES, USDT → USD cash), and no pair may be added without a new decision.

A market is a geographic service scope, not just a city-name string. Each offer belongs to one market; searches require a selected market and must validate that location filters stay within it. The LLM cannot switch markets. Conversations and agreed exchange records inherit market context from the offer. Identity/authentication are global, and market selection is not authorization; the API validates market scope and seller eligibility on every operation. Whether seller profiles and subscription billing are global or market-specific remains open.

The app connects people; it does not custody cash/crypto, settle exchanges, or provide escrow. In-person safety, public meeting places, reputation, reporting, and moderation are part of the product domain. Natural-language search may use an LLM only to parse text into typed criteria; never let the model generate/execute SQL or own monetary rules or deterministic ranking.

The target architecture is a React Native + Expo mobile client (gluestack UI, RTK Query for server state, Redux Toolkit for client state, React Hook Form for forms) and a modular/hexagonal NestJS API backed by PostgreSQL/PostGIS through Prisma ORM. The approved MVP design includes passkey or username/email + password sign-in, verified email for email sign-in/password recovery, and a verified phone number as contact only. These decisions describe the target, not necessarily implemented behavior. Read `README.md` and `docs/` for product context and Mermaid diagrams.

Before assuming a product capability exists, inspect the code and tests and distinguish implemented behavior from planned behavior. Do not imply that verification/KYC, meeting safety, or badges guarantee a safe exchange.

## Spec-driven development

Work is planned as OpenSpec changes. The backlog is authored in Notion; the durable plan lives in the repository.

- **Requirement** — Do not write production code for a feature, bug, or behavior change until an approved change exists under `openspec/changes/<change-id>/`. A human reviews the planning artifacts before implementation starts.
- **Requirement** — Run the loop as explore → propose → human review → apply → verify → archive. `openspec-propose` plans only and must not implement; start `/openspec-apply-change` in a fresh session once the plan is approved.
- **Requirement** — Keep one change per backlog task. Do not batch several Notion tasks into one change.
- **Requirement** — Start a task only when its direct dependencies are Done. The backlog is a dependency graph with parallel waves, not a linear chain: independent tasks run concurrently, and a failing task blocks only its dependents.
- **Requirement** — Every implementation task must add or update end-to-end coverage for its acceptance criteria **before** implementing the feature's behavior, and cannot be marked Done until those scenarios pass. If coverage cannot be implemented or a scenario fails, stop the task, document the concrete blocker, and ask; never waive the requirement. Entry points, isolation guarantees, and conventions: [`docs/testing/e2e.md`](docs/testing/e2e.md).
- **Requirement** — The end-to-end foundation is a global gate. No not-yet-Done task — including a discovery spike — begins until the API suite and the mobile flows pass.
- **Requirement** — End-to-end scenarios live in their own folder (`apps/api/test/e2e/`, `apps/mobile/e2e/`), separate from everything else.
- **Requirement** — Everything testable has its own test beside it, as `<name>.spec.ts` next to the source: feature file, utility, service, controller, adapter, port, component, and hook. There is no untested unit of behavior, and no test folder mirroring `src/` — the test lives with what it tests.
- **Requirement** — `tasks.md` is the progress source of truth; there is no hidden state. Each behavior task names its test file and the exact command that runs it, and the red phase from `tdd-red-first` is verified before implementing.
- **Requirement** — Never hand-create a change folder or write artifacts from memory. Use `openspec new change` and `openspec instructions` so `.openspec.yaml`, the schema templates, and the rules in `openspec/config.yaml` apply.
- **Requirement** — Validate before presenting a plan: `openspec validate <change-id> --strict`. A change with no spec delta must set `skip_specs: true` in `.openspec.yaml` instead of inventing a requirement.
- **Requirement** — Archive with `/openspec-archive-change` when every task is checked. Archiving merges the change's deltas into `openspec/specs/`, which then describes what the system does; `openspec/changes/archive/` is the history. Update the Notion task state on propose, apply, and archive.
- **Recommendation** — Use `/sdd-from-notion` to turn a backlog task into a change, and `/openspec-verify-change` to check the implementation against the artifacts before archiving. `.devin/plans/` is session scratch: if a decision must persist, it belongs in an OpenSpec change.

## PostgreSQL and PostGIS

- **Requirement** — Treat PostgreSQL as the source of truth for persistent data and business invariants. Client validation does not replace server- or database-side validation.
- **Requirement** — Change schemas only through explicit, reviewable migrations that work with existing environments. Include a deployment/recovery strategy when appropriate; do not edit production schemas manually.
- **Requirement** — Use **Prisma ORM as the single owner of the schema and of migrations** (`apps/api/prisma/`). `node-pg-migrate` was removed; never run a second migration runner against the same schema. Disable automatic schema synchronization in shared and production environments.
- **Requirement** — Pin Prisma to a supported stable major (`^7`). Do not install `prisma@latest`: the `latest` tag resolves to a release candidate of the next major, and that CLI has no `generate`, `migrate dev`, or `db push`. Re-check the official release status before any major upgrade.
- **Requirement** — Prisma cannot express `CHECK` constraints and does not introspect them. Keep them as hand-written SQL inside `--create-only` migrations and verify them against `pg_constraint`; a future `migrate dev` that proposes dropping one means the schema drifted. `CREATE EXTENSION postgis` is unmodelled by Prisma too, but it is **not** in `prisma/migrations`: it is installed by `docker/initdb/01-create-databases.sql` for local development and by `test/provision-e2e-database.cjs` for each disposable test database. A database created without the init script has no PostGIS and `migrate deploy` will not add it, so verify the extension before introducing the first spatial table.
- **Requirement** — Declare partial indexes in `schema.prisma` through the `partialIndexes` preview feature (`@@unique(..., where: raw(...))`), never as hand-edited SQL: Prisma Migrate has emitted `DROP INDEX` for hand-written partial indexes.
- **Requirement** — Keep raw SQL to a minimum, and where Prisma has no equivalent (`FOR UPDATE`, `GREATEST`, `RETURNING` used as a compare-and-swap), preserve the original atomicity with `$queryRaw`/`$executeRaw` or an `updateMany` compare-and-swap. Never downgrade an atomic guard into a read-then-write; session rotation and challenge consumption are security-critical.
- **Requirement** — Prisma has no native geometry type. Keep spatial columns and `ST_DWITHIN` queries in migrations and `$queryRaw`, and decide the `Unsupported(...)` mapping when the first spatial table is introduced.
- **Requirement** — Use appropriate types and database constraints (`NOT NULL`, `CHECK`, `FOREIGN KEY`, `UNIQUE`) where applicable. Do not rely only on application code for referential integrity, uniqueness, or invariants the database can enforce.
- **Requirement** — Parameterize SQL values; never interpolate untrusted input into SQL. Use explicit allowlists for identifiers/options that cannot be parameterized.
- **Requirement** — Store monetary amounts as `numeric`/decimal or integers in a domain-defined minor unit; never use binary floating point for monetary calculations. Define scale, rounding, and currency explicitly.
- **Requirement** — Keep each transaction scoped to one atomic business operation; do not hold it open during network calls or slow work. Keep invariants inside the transaction to prevent partial writes and races.
- **Requirement** — Review indexes for important query patterns (filters, joins, ordering, and uniqueness). Add indexes that support real, frequent, or critical queries and validate them with representative statistics/query plans. Do not index every column indiscriminately: indexes use storage and add write overhead; a sequential scan can be the correct plan.
- **Requirement** — Before calling a critical query optimized, review its SQL, expected volume, cardinality, and `EXPLAIN` plan. Use `EXPLAIN ANALYZE` on representative test data when safe, remembering it executes the query. Do not force index use without evidence.
- **Requirement** — Paginate collections, cap page size, and use stable ordering. Use cursors when scale or consistency requires them. Avoid N+1 queries and unbounded reads; batch or join relations appropriately.
- **Requirement** — For proximity searches, use consistent SRIDs and understand units: `geometry` uses the SRID's units; `geography` uses meters. Use `ST_DWithin` for proximity filters and appropriate GiST spatial indexes; validate the real query plan.
- **Requirement** — Apply least privilege per environment/service; the application must not use database administrator credentials. Keep secrets out of the repository and use the approved secret mechanism for each environment.
- **Requirement** — Define backups, retention, and restore procedures for relevant data; periodically test restores, not just backup creation. Collect personal data only for a defined purpose, with controlled access and retention; delete or anonymize it when appropriate.

## Node.js and NestJS — hexagonal architecture

- **Requirement** — Keep the domain independent of NestJS, HTTP, PostgreSQL/ORM, and external providers. Dependencies point inward to domain/application; infrastructure implements contracts defined inward.
- **Recommendation** — Organize by business module/context and separate responsibilities within each module. Suggested structure:
  - `domain/`: domain models, value objects, invariants, and domain services; no infrastructure dependencies.
  - `application/`: use cases/application services and the ports (interfaces) they need.
  - `adapters/in/`: HTTP controllers, DTOs, and other inbound adapters; translate protocols and delegate to use cases.
  - `adapters/out/` or `infrastructure/`: port implementations such as PostgreSQL repositories, maps, messaging, and external services.
  - `module.ts`: NestJS composition and dependency injection wiring.
    Adapt names and granularity to module size; do not create empty or ceremonial layers.
- **Requirement** — Define repository ports near the application/domain that needs them and concrete implementations in infrastructure. Use cases depend on interfaces, not ORM, SQL, persistence models, or concrete repositories.
- **Requirement** — Separate domain models from ORM/persistence models and HTTP DTOs when their responsibilities or change cycles differ. Map at boundaries; never expose ORM entities directly through the API.
- **Requirement** — Keep controllers thin: validate/translate transport input, call a use case, and map results to responses. Controllers must not contain business rules or access the database directly.
- **Requirement** — Keep HTTP DTOs inside inbound adapters. Define application use-case input/output contracts in `application/` and map DTOs to those contracts at the inbound boundary; application/domain code must not import HTTP DTOs.
- **Recommendation** — Keep pure helpers in the layer that owns their rules: domain normalization/invariants in `domain/`, application-specific validation in `application/`, and protocol translation in adapters. Avoid accumulating unrelated helpers or use-case contracts inside a service file; split by responsibility when it improves clarity, without adding ceremonial layers.
- **Requirement** — Before completing a feature or refactor, review changed-file responsibilities and dependency direction against this architecture, in addition to checking behavior and tests.
- **Requirement** — Use cases coordinate application operations and ports. Keep business invariants in the domain or appropriate use case; do not duplicate them across controllers, repositories, and services.
- **Requirement** — Define input DTOs and strictly validate types, ranges, and formats. When using NestJS `ValidationPipe` with `class-validator`, enable `whitelist: true` and `forbidNonWhitelisted: true`; never trust client-declared types.
- **Requirement** — Authenticate users and authorize every operation on every resource, including IDs from URLs/bodies. Check ownership, scope, and permissions on the server; authentication does not imply authorization.
- **Requirement** — Validate required configuration at startup. If variables are missing or invalid, fail clearly without printing secrets.
- **Requirement** — Set HTTP limits appropriate to risk: request rate, payload size, and timeouts. Configure Helmet and CORS for the actual clients and allowed origins.
- **Requirement** — Return controlled errors that do not expose stack traces, SQL, secrets, or unnecessary personal data. Log useful diagnostics with appropriate access/retention, excluding credentials and tokens.
- **Requirement** — Do not block the event loop with expensive calculations, regular expressions, or synchronous processing. Bound per-request work and delegate heavy work when needed.
- **Recommendation** — Unit-test domain rules/use cases; integration-test adapters/repositories against PostgreSQL; add e2e tests for critical HTTP flows, authorization, and failures.
- **Requirement** — Verify dependencies and version changes before adding them; keep the adopted package-manager lockfile in sync. Do not add tools/libraries by convention alone.

## React

- **Requirement** — Keep presentation components focused on rendering UI, composing components, and connecting events to actions. Do not put business rules or domain calculations in a component body or JSX.
- **Requirement** — Extract business logic needed by the UI into pure domain utilities/functions or frontend use cases outside components. Components consume results and delegate actions; they do not reimplement backend rules as the authority.
- **Requirement** — Use custom Hooks for logic that needs React capabilities (state, context, synchronization lifecycle, or Hook composition). Do not automatically turn all business logic into Hooks; keep pure functions independent of React and easy to test.
- **Requirement** — Follow React rules: keep rendering pure, treat props/state as immutable, and call Hooks only at the top level of components or other Hooks. Do not call components as ordinary functions.
- **Requirement** — Do not use Effects to calculate derived data or perform actions caused by user events. Derive view data with pure calculations and handle actions in event handlers/use cases; reserve Effects for synchronizing with external systems.
- **Requirement** — Avoid redundant, duplicated, or contradictory state. Group values that change together and derive computable values instead of synchronizing extra state.
- **Requirement** — Build accessible interfaces and represent loading, error, and empty states with recovery actions where appropriate. Preserve labels, semantics, focus, and nonvisual interaction alternatives.
- **Recommendation** — Use TypeScript and reusable components when the project has adopted it and reuse is real. Prefer small explicit interfaces; avoid premature abstractions.
- **Requirement** — Fetch server state through **RTK Query only**: one `createApi` slice per base URL. Do not add a second server-state cache (for example TanStack Query) next to it; two caches holding the same resource contradict the no-duplicated-state rule above.
- **Requirement** — Use **Redux Toolkit** for app-wide client state. Keep server data out of hand-written slices: RTK Query owns that cache, and duplicating it in a slice is the redundant state the rules forbid.
- **Requirement** — Build forms with **React Hook Form**. Keep the rules with the form and never treat client-side validation as the authority; the API validates again.
- **Recommendation** — Compose UI from **gluestack-ui** components instead of ad-hoc styling, so the design system stays coherent.

## React Native (Expo mobile client)

- **Requirement** — Never store tokens, keys, or secrets in insecure storage or bundle them in the app. Access and refresh tokens belong in `expo-secure-store` (platform keystore), never in AsyncStorage or another plaintext store.
- **Requirement** — Request permissions only when a feature needs them, explain why, and handle denial/revocation without unnecessarily blocking the app.
- **Requirement** — Make offline, pending-sync, and network-error states explicit. Do not present local writes as server-confirmed; define which data may persist offline and how retries/conflicts are handled.
- **Requirement** — Wire RTK Query's `setupListeners` together with NetInfo for reconnect refetching. Do not assume browser online/focus events exist on device.

## Primary references

Use these references to verify or expand the conventions; they do not replace analysis of each change.

- **NestJS:** [validation](https://docs.nestjs.com/application/validation), [configuration](https://docs.nestjs.com/application/configuration), [authentication](https://docs.nestjs.com/security/authentication), [authorization](https://docs.nestjs.com/security/authorization), [rate limiting](https://docs.nestjs.com/security/rate-limiting), [testing](https://docs.nestjs.com/fundamentals/testing).
- **Node.js:** [security best practices](https://nodejs.org/learn/getting-started/security-best-practices), [do not block the event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop).
- **PostgreSQL:** [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [indexes](https://www.postgresql.org/docs/current/indexes-intro.html), [examining index usage](https://www.postgresql.org/docs/current/indexes-examine.html).
- **PostGIS:** [spatial queries](https://postgis.net/docs/using_postgis_query.html), [ST_DWithin](https://postgis.net/docs/ST_DWithin.html).
- **Migrations:** [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate), [Prisma config](https://www.prisma.io/docs/orm/reference/prisma-config-reference), [unsupported database features](https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-database-features), [indexes and partial indexes](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes).
- **OWASP:** [database security](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html), [SQL injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
- **React:** [rules](https://react.dev/reference/rules), [reusing logic with Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), [state structure](https://react.dev/learn/choosing-the-state-structure), [when an Effect is unnecessary](https://react.dev/learn/you-might-not-need-an-effect).
- **Redux Toolkit / RTK Query:** [RTK Query overview](https://redux.js.org/toolkit/rtk-query/overview), [comparison with other tools](https://redux.js.org/toolkit/rtk-query/comparison), [cache behaviour](https://redux.js.org/toolkit/rtk-query/usage/cache-behavior).
- **Forms:** [React Hook Form](https://react-hook-form.com/docs).
- **Spec-driven development:** [OpenSpec](https://openspec.dev/docs), [project configuration](https://openspec.dev/docs/project-config), [spec-driven schema](https://openspec.dev/docs/schemas/spec-driven), [Notion MCP](https://developers.notion.com/guides/mcp/get-started-with-mcp).
- **React Native:** [security](https://reactnative.dev/docs/security), [gluestack-ui](https://gluestack.io/ui/docs/home/getting-started/installation).
