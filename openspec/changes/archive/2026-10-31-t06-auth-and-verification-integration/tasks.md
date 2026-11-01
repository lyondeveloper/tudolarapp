# Tasks

## 1. Mobile RTK Query Phone Verification Endpoints

- [x] 1.1 Add failing unit test for `requestPhoneVerification` and `verifyPhone` endpoints in `apps/mobile/src/services/api.spec.ts` (`npm --prefix apps/mobile test -- --watchman=false src/services/api.spec.ts`).
- [x] 1.2 Implement `requestPhoneVerification` and `verifyPhone` endpoints in `apps/mobile/src/services/api.ts` and verify unit tests pass (`npm --prefix apps/mobile test -- --watchman=false src/services/api.spec.ts`).

## 2. Live Registration Form Integration

- [x] 2.1 Update `apps/mobile/src/features/auth/register-form.spec.tsx` with failing test asserting live mutation dispatch upon registration submit (`npm --prefix apps/mobile test -- --watchman=false src/features/auth/register-form.spec.tsx`).
- [x] 2.2 Implement live `registerWithPassword` mutation call and success state in `apps/mobile/src/features/auth/use-register-form.ts` and `apps/mobile/src/features/auth/register-form.tsx`, and verify tests pass (`npm --prefix apps/mobile test -- --watchman=false src/features/auth/register-form.spec.tsx`).
- [x] 2.3 Verify `register-screen.spec.tsx` passes with live registration state (`npm --prefix apps/mobile test -- --watchman=false src/__tests__/register-screen.spec.tsx`).

## 3. Quality Gates & Verification

- [x] 3.1 Run full API test suite (`npm --prefix apps/api test -- --watchman=false`).
- [x] 3.2 Run API build (`npm --prefix apps/api run build`).
- [x] 3.3 Run API linter (`cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts"`).
- [x] 3.4 Run mobile test suite (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2`).
- [x] 3.5 Run mobile linter (`cd apps/mobile && EXPO_NO_TELEMETRY=1 npx expo lint`).
