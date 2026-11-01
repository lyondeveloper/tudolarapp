# Tasks

## 1. Database Model & Prisma Migration

- [x] 1.1 Add `SellerEligibility` model to `apps/api/prisma/schema.prisma` and create migration with `CHECK (state IN ('none', 'contact_verified', 'eligible', 'suspended', 'rejected'))`.
- [x] 1.2 Verify migration application and add constraint to `apps/api/test/e2e/migration-reproducibility.cjs`.

## 2. Backend Persistence & Application Service

- [x] 2.1 Add failing unit test for `PrismaSellerRepository` in `apps/api/src/sellers/adapters/out/persistence/prisma-seller.repository.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/sellers/adapters/out/persistence/prisma-seller.repository.spec.ts`).
- [x] 2.2 Implement `PrismaSellerRepository` and verify test passes (`npm --prefix apps/api test -- --watchman=false src/sellers/adapters/out/persistence/prisma-seller.repository.spec.ts`).
- [x] 2.3 Add failing unit test for `SellerService` in `apps/api/src/sellers/application/seller.service.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/sellers/application/seller.service.spec.ts`).
- [x] 2.4 Implement `SellerService` enforcing onboarding invariants and verify test passes (`npm --prefix apps/api test -- --watchman=false src/sellers/application/seller.service.spec.ts`).
- [x] 2.5 Wire `SellerController` and register providers and exports in `apps/api/src/sellers/sellers.module.ts`.

## 3. Mobile RTK Query Integration

- [x] 3.1 Add failing unit test for seller eligibility endpoints in `apps/mobile/src/services/api.spec.ts` (`npm --prefix apps/mobile test -- --watchman=false src/services/api.spec.ts`).
- [x] 3.2 Implement `sellerEligibility` query and `onboardSeller` mutation in `apps/mobile/src/services/api.ts` and verify unit test passes (`npm --prefix apps/mobile test -- --watchman=false src/services/api.spec.ts`).

## 4. End-to-End Verification & Quality Gates

- [x] 4.1 Add E2E scenario in `apps/api/test/e2e/seller-eligibility.e2e-spec.ts` testing seller eligibility lifecycle, onboarding, and public profile privacy boundaries, and verify it passes (`npm --prefix apps/api run test:e2e`).
- [x] 4.2 Run full API test suite (`npm --prefix apps/api test -- --watchman=false`).
- [x] 4.3 Run API build (`npm --prefix apps/api run build`).
- [x] 4.4 Run API linter (`cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts"`).
- [x] 4.5 Run mobile test suite (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2`).
- [x] 4.6 Run mobile linter (`cd apps/mobile && EXPO_NO_TELEMETRY=1 npx expo lint`).
