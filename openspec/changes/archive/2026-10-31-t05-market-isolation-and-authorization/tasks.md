# Tasks

## 1. Backend Market Isolation Invariants & Error Codes

- [x] 1.1 Add failing unit test for `assertMarketMatch` and `MARKET_MISMATCH` in `apps/api/src/common/market-context/market-isolation.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/common/market-context/market-isolation.spec.ts`).
- [x] 1.2 Implement `assertMarketMatch` and add `MARKET_MISMATCH` to `ApiErrorCode` in `apps/api/src/common/errors/api-error-code.ts` and `apps/api/src/common/market-context/market-isolation.ts`, and verify unit test passes (`npm --prefix apps/api test -- --watchman=false src/common/market-context/market-isolation.spec.ts`).
- [x] 1.3 Add test scenario verifying independence of authentication and market scoping in `apps/api/src/common/market-context/market-context.guard.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/common/market-context/market-context.guard.spec.ts`).

## 2. Mobile Market State & RTK Query Header Injection

- [x] 2.1 Add failing unit test for mobile Redux `marketSlice` in `apps/mobile/src/features/marketplace/market-slice.spec.ts` (`npm --prefix apps/mobile test -- --watchman=false src/features/marketplace/market-slice.spec.ts`).
- [x] 2.2 Implement `marketSlice` in `apps/mobile/src/features/marketplace/market-slice.ts` and register it in `apps/mobile/src/store/index.ts`, and verify unit test passes (`npm --prefix apps/mobile test -- --watchman=false src/features/marketplace/market-slice.spec.ts`).
- [x] 2.3 Add failing unit test for RTK Query `X-Market-Id` header injection in `apps/mobile/src/services/api.spec.ts` (`npm --prefix apps/mobile test -- --watchman=false src/services/api.spec.ts`).
- [x] 2.4 Update `prepareHeaders` in `apps/mobile/src/services/api.ts` to attach `X-Market-Id` from state and verify test passes (`npm --prefix apps/mobile test -- --watchman=false src/services/api.spec.ts`).

## 3. End-to-End Verification & Quality Gates

- [x] 3.1 Add E2E scenario in `apps/api/test/e2e/market-isolation.e2e-spec.ts` testing cross-market rejection and market-scoped route contracts, and verify it passes (`npm --prefix apps/api run test:e2e`).
- [x] 3.2 Run full API test suite (`npm --prefix apps/api test -- --watchman=false`).
- [x] 3.3 Run API build (`npm --prefix apps/api run build`).
- [x] 3.4 Run API linter (`cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts"`).
- [x] 3.5 Run mobile test suite (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2`).
- [x] 3.6 Run mobile linter (`cd apps/mobile && EXPO_NO_TELEMETRY=1 npx expo lint`).
