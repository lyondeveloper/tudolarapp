# Tasks

## 1. Spatial Allowlist & Infrastructure Query Port

- [x] 1.1 Register `{ table: 'offers', geographyColumn: 'location' }` in `PRODUCTION_SPATIAL_ALLOWLIST` in `apps/api/src/database/spatial/proximity-filter.ts` and verify unit tests (`npm --prefix apps/api test -- apps/api/src/database/spatial/proximity-filter.spec.ts`).
- [x] 1.2 Add failing unit test for `PrismaSearchQueryRepository` in `apps/api/src/search/infrastructure/prisma-search-query.repository.spec.ts` (`npm --prefix apps/api test -- apps/api/src/search/infrastructure/prisma-search-query.repository.spec.ts`).
- [x] 1.3 Implement `PrismaSearchQueryRepository` in `apps/api/src/search/infrastructure/prisma-search-query.repository.ts` and verify unit tests pass.

## 2. Application Use Case (TDD Red-First)

- [x] 2.1 Add failing unit test for `SearchOffersUseCase` in `apps/api/src/search/application/search-offers.use-case.spec.ts` (`npm --prefix apps/api test -- apps/api/src/search/application/search-offers.use-case.spec.ts`).
- [x] 2.2 Implement `SearchOffersUseCase` in `apps/api/src/search/application/search-offers.use-case.ts` and verify unit tests pass.

## 3. Inbound Controller & Search Module Wiring

- [x] 3.1 Add failing unit test for `SearchController` in `apps/api/src/search/adapters/in/http/search.controller.spec.ts` (`npm --prefix apps/api test -- apps/api/src/search/adapters/in/http/search.controller.spec.ts`).
- [x] 3.2 Implement `SearchController` in `apps/api/src/search/adapters/in/http/search.controller.ts` and wire `SearchModule`.

## 4. Mobile Client Integration

- [x] 4.1 Add `searchOffers` query endpoint to `apps/mobile/src/services/api.ts` and verify unit tests (`npm --prefix apps/mobile test -- apps/mobile/src/services/api.spec.ts --watchman=false`).

## 5. End-to-End Verification & Quality Gates

- [x] 5.1 Implement E2E test `apps/api/test/e2e/geospatial-search.e2e-spec.ts` (`npm --prefix apps/api test:e2e -- apps/api/test/e2e/geospatial-search.e2e-spec.ts`).
- [x] 5.2 Run complete API test suite, build, and linter (`npm --prefix apps/api test -- --watchman=false && npm --prefix apps/api run build && npm --prefix apps/api run lint`).
- [x] 5.3 Run complete mobile test suite and linter (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2 && npm --prefix apps/mobile run lint`).

## Workflow follow-up

- Archive change with `openspec archive t10-geospatial-search-with-postgis --yes`.
- Open PR for T10, squash and merge into main.
