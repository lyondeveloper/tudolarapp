# Tasks

## 1. Stack and boundary ADRs

- [x] 1.1 Write `docs/adr/0019-prisma-owns-the-schema-and-migrations.md`, recording the decision and its rationale and citing `AGENTS.md` rather than restating it; verify it names the single authority and that no second runner is permitted.
- [x] 1.2 Write `docs/adr/0020-hexagonal-architecture-in-the-api.md`: the layer names, the dependency direction, and the rule that `domain/` imports nothing infrastructural. Verify against the existing `auth/` shape.
- [x] 1.3 Write `docs/adr/0021-rtk-query-owns-remote-state.md`: RTK Query as the sole remote-state layer and Redux Toolkit for client state only. Verify it forbids a second server-state cache.
- [x] 1.4 Write `docs/adr/0022-gluestack-is-the-design-system.md`, pointing at the existing design-system spec rather than duplicating its tokens.
- [x] 1.5 Write `docs/adr/0023-postgis-through-prisma.md`: the `Unsupported("geometry")` mapping, raw SQL confined to `adapters/out/`, and the SRID/GiST expectations. Verify it matches `AGENTS.md`'s PostGIS rules.
- [x] 1.6 Write `docs/adr/0024-react-native-expo-mobile-client.md`, citing the mobile `AGENTS.md` for its own conventions.
- [x] 1.7 Write `docs/adr/0025-api-module-boundaries.md`: the module table from `design.md`, naming which module owns each contract and the rule that `catalog` alone declares pair, asset, rail, and money types.
- [x] 1.8 Extend `docs/adr/README.md` so its index lists 0019–0025 in the existing format; verify no row is missing and the scoped intro still reads correctly.

## 2. The migration authority

- [x] 2.1 Add a `--create-only` migration under `apps/api/prisma/migrations/` containing `CREATE EXTENSION IF NOT EXISTS postgis`, and verify it applies on a database created without the init script: drop the extension, run `npm run test:e2e -- --runInBand` from `apps/api`, and confirm the extension is present afterwards.
- [x] 2.2 Add a startup assertion that fails loudly when PostGIS is absent, with a message naming the migration; verify by dropping the extension and confirming startup fails with that message rather than a query error.
- [x] 2.3 Verify the E2E provisioning path still works with the migration as the authority: run the suite in a worktree whose database does not exist and confirm it is created, migrated, and passes.

## 3. The API contract

- [ ] 3.1 Write the failing test for the error envelope in `apps/api/src/common/errors/error-envelope.spec.ts`: every thrown application error and every `ValidationPipe` rejection answer with `{ error: { code, message, details? }, requestId }` and a code from the closed enum; verify it fails with `npm test -- error-envelope` from `apps/api`.
- [ ] 3.2 Implement the envelope and the code enum, mapping the existing auth filter's shape and Nest's validation shape into it; verify the test from 3.1 passes and that the existing e2e auth scenarios still pass unchanged.
- [ ] 3.3 Write the failing test for the market-context guard in `apps/api/src/common/market-context/market-context.guard.spec.ts`: a market-scoped endpoint rejects a missing header with a coded `400`, rejects an unknown market, and never defaults to all markets; verify it fails.
- [ ] 3.4 Implement the guard and the `X-Market-Id` contract; verify 3.3 passes and that the guard is applied by explicit opt-in rather than globally, so health and auth stay market-free.
- [ ] 3.5 Write the failing test for cursor pagination in `apps/api/src/common/pagination/cursor-pagination.spec.ts`: `?limit&cursor` caps the page size, returns an opaque `nextCursor`, and orders stably; verify it fails.
- [ ] 3.6 Implement cursor pagination and the shared `{ items, nextCursor }` response shape; verify 3.5 passes.
- [ ] 3.7 Add the `/v1` URI prefix and update the mobile base URL in `apps/mobile/src/services/api.ts`; verify `npm run e2e` from `apps/mobile` still passes against the running API.

## 4. Catalog and money

- [ ] 4.1 Write the failing test for the catalog in `apps/api/src/catalog/catalog.spec.ts`: exactly the five pair ids exist, each maps to an ordered `(give, receive)` of legs, the unqualified "VES" leg resolves to physical cash, and an unknown pair id is rejected; verify it fails.
- [ ] 4.2 Implement the catalog as pure domain with no infrastructural imports; verify 4.1 passes.
- [ ] 4.3 Write the failing test for money in `apps/api/src/catalog/money.spec.ts`: values are exact decimals, never floats; rounding happens once to the receive asset's minor unit (VES and USD 2, USDT 6); and a value that cannot round exactly is rejected rather than silently truncated. Verify it fails.
- [ ] 4.4 Implement the money value object; verify 4.3 passes.

## 5. The quote and terms-version contract

- [ ] 5.1 Write the failing test for terms-version immutability in `apps/api/src/offers/domain/offer-terms-version.spec.ts`: a material edit produces version N+1, the offer's current pointer moves, and no version row is ever updated; verify it fails.
- [ ] 5.2 Implement the version model and the insert-only rule; verify 5.1 passes.
- [ ] 5.3 Write the failing integration test that the database itself rejects an update to a version row — asserting the privilege or trigger from the migration, not application discipline; verify it fails before the migration exists.
- [ ] 5.4 Add the `--create-only` migration enforcing insert-only version rows, and verify the test from 5.3 passes.
- [ ] 5.5 Write the failing test for the quote in `apps/api/src/offers/domain/quote.spec.ts`: a quote freezes a `termsVersionId` for a buyer, expires after 15 minutes, carries no reference rate and no reference as-of time, and a confirmation binds to the version it was shown; verify it fails.
- [ ] 5.6 Implement the quote; verify 5.5 passes.
- [ ] 5.7 Write the failing test that an agreement references a `termsVersionId` rather than copying terms, and that a later offer edit cannot change a confirmed agreement's numbers; verify it fails.
- [ ] 5.8 Implement the agreement's reference to the version id; verify 5.7 passes.

## 6. Module scaffolding and contracts

- [ ] 6.1 Create the module directories and `module.ts` wiring for `markets`, `sellers`, `subscriptions`, `offers`, `search`, `conversations`, `exchanges`, and `reports`, each with the hexagonal layer folders it will actually use and none it will not; verify `npm run build` and `npm run test:e2e -- --runInBand` still pass.
- [ ] 6.2 Define the initial DTOs and application ports for each module, one file per module under its `adapters/in/http/` and `application/`, importing the shared `catalog`, error, pagination, and market-context contracts rather than redeclaring them; verify `npx tsc --noEmit` is clean and no module declares its own pair, asset, rail, or money type.
- [ ] 6.3 Define the entitlement port as the **only** subscription surface in the MVP, per ADR-0014, with a test adapter selected under `NODE_ENV=test` and refused in production; verify the refusal by starting the API with production configuration and the test adapter selected.
- [ ] 6.4 Define the natural-language parser port and leave it unimplemented, per ADR-0015, so the deferral is a missing adapter rather than a redesign; verify the port exists, is wired nowhere, and no route exposes it.

## 7. Safe PostGIS queries

- [ ] 7.1 Write the failing test for the market predicate in `apps/api/src/markets/domain/market-predicate.spec.ts`: the market predicate and the proximity predicate always appear in the same `WHERE`, so a query cannot return an out-of-market offer; verify it fails.
- [ ] 7.2 Implement the predicate builder and the parameterized query helper, with an explicit allowlist for anything that cannot be parameterized; verify 7.1 passes.
- [ ] 7.3 Verify no raw SQL escapes the adapters: grep the `domain/` and `application/` layers for `$queryRaw`, `$executeRaw`, and string-interpolated SQL, and confirm there are none.

## 8. Verification

- [ ] 8.1 Run `npx tsc --noEmit`, `npm run build`, `npm test -- --runInBand`, and `npm run test:e2e -- --runInBand` from `apps/api`, and record the counts.
- [ ] 8.2 Run `npm test`, `npx tsc --noEmit`, and `npx expo lint` from `apps/mobile`, and record the counts; lint must stay at its 16-warning baseline.
- [ ] 8.3 Confirm every contract in `design.md` traces to an ADR or a spike finding, and that groups **I** and **G** are still marked open wherever a contract touches them.
- [ ] 8.4 Run `openspec validate t02-technical-contracts --strict` and confirm it passes with `specs` correctly skipped.

## Workflow follow-up

- Delivered on a feature branch through a pull request, per the repository rule; never pushed to `main` directly.
- T03 (Prisma and the data foundation) and T15 (mobile shell) can start in parallel once this is Done.
- Archive this change after review. It declares `skip_specs: true`, so archiving contributes no spec delta.
