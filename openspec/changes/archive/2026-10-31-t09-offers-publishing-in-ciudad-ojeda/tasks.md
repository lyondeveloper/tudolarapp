# Tasks

## 1. Database Schema & Migration

- [x] 1.1 Add `Offer` model to `apps/api/prisma/schema.prisma` with spatial index and generate `--create-only` migration.
- [x] 1.2 Add hand-written SQL `CHECK` constraints to migration file, update `EXPECTED_CHECK_CONSTRAINTS` in `apps/api/test/e2e/migration-reproducibility.cjs`, apply migration, and generate Prisma client.

## 2. Domain & Application (TDD Red-First)

- [x] 2.1 Add failing unit tests for `Offer` domain entity invariants in `apps/api/src/offers/domain/offer.spec.ts` (`npm --prefix apps/api test -- apps/api/src/offers/domain/offer.spec.ts`).
- [x] 2.2 Implement `Offer` entity in `apps/api/src/offers/domain/offer.ts` and verify unit tests pass.
- [x] 2.3 Add failing unit tests for `PublishOfferUseCase` in `apps/api/src/offers/application/publish-offer.use-case.spec.ts` (`npm --prefix apps/api test -- apps/api/src/offers/application/publish-offer.use-case.spec.ts`).
- [x] 2.4 Implement `PublishOfferUseCase` in `apps/api/src/offers/application/publish-offer.use-case.ts` and verify unit tests pass.

## 3. Adapters & Endpoints

- [x] 3.1 Implement `PrismaOfferRepository` and `PrismaTermsVersionRepository` in `apps/api/src/offers/infrastructure/` and verify unit tests (`npm --prefix apps/api test -- apps/api/src/offers/infrastructure/prisma-offer.repository.spec.ts`).
- [x] 3.2 Add failing controller test for `POST /offers` in `apps/api/src/offers/adapters/in/offers.controller.spec.ts` (`npm --prefix apps/api test -- apps/api/src/offers/adapters/in/offers.controller.spec.ts`).
- [x] 3.3 Implement `OffersController` and wire `OffersModule` with dependency injection.

## 4. Mobile Client Integration

- [x] 4.1 Wire `publishOffer` RTK Query mutation in `apps/mobile/src/services/api.ts` and `use-publish-offer-form.ts` and verify with mobile unit tests (`npm --prefix apps/mobile test -- apps/mobile/src/features/marketplace/use-publish-offer-form.spec.ts --watchman=false`).

## 5. End-to-End Verification & Quality Gates

- [x] 5.1 Implement E2E test `apps/api/test/e2e/offers-publishing.e2e-spec.ts` (`npm --prefix apps/api test:e2e -- apps/api/test/e2e/offers-publishing.e2e-spec.ts`).
- [x] 5.2 Run complete API test suite, build, and linter (`npm --prefix apps/api test -- --watchman=false && npm --prefix apps/api run build && npm --prefix apps/api run lint`).
- [x] 5.3 Run complete mobile test suite and linter (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2 && npm --prefix apps/mobile run lint`).

## Workflow follow-up

- Archive change with `openspec archive t09-offers-publishing-in-ciudad-ojeda --yes`.
- Open PR for T09, squash and merge into main.
- Proceed to T10.
