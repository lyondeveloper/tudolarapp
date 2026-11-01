# Tasks

## 1. Remove Guest Browse from Sign-In Screen

- [x] 1.1 Update `apps/mobile/src/features/auth/sign-in-form.spec.tsx` and `apps/mobile/src/__tests__/app-shell.anonymous.spec.tsx` to assert that `sign-in-guest-browse` is omitted and verify failing test (`npm --prefix apps/mobile test -- apps/mobile/src/features/auth/sign-in-form.spec.tsx --watchman=false`).
- [x] 1.2 Remove the guest browse escape button (`sign-in-guest-browse`) from `apps/mobile/src/features/auth/sign-in-form.tsx` and verify unit tests pass (`npm --prefix apps/mobile test -- apps/mobile/src/features/auth/sign-in-form.spec.tsx --watchman=false`).

## 2. Streamline Home Screen & Enforce Authentication Guard

- [x] 2.1 Update `apps/mobile/src/__tests__/home-marketplace.spec.tsx` to assert `<RequireAuthenticated>` redirection, removal of the map toggle (`home-view-map`), and pair filter modal interaction, then verify failing test (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/home-marketplace.spec.tsx --watchman=false`).
- [x] 2.2 In `apps/mobile/src/app/home.tsx`, re-wrap with `<RequireAuthenticated>`, remove the guest prompt branch, remove the "Lista / Mapa Ojeda" switcher, and implement the filter modal / trigger bar. Verify tests pass (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/home-marketplace.spec.tsx --watchman=false`).

## 3. Enforce Authentication Guard on Profile Screen

- [x] 3.1 Update `apps/mobile/src/__tests__/profile-screen.spec.tsx` to assert that unauthenticated visits to `/profile` are protected by `<RequireAuthenticated>` and verify failing test (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/profile-screen.spec.tsx --watchman=false`).
- [x] 3.2 Re-wrap `apps/mobile/src/app/profile.tsx` with `<RequireAuthenticated>`, remove the guest profile banner and guest state branch, and verify tests pass (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/profile-screen.spec.tsx --watchman=false`).

## 4. Full Verification

- [x] 4.1 Run full mobile test suites (`npm --prefix apps/mobile test -- --watchman=false`) and linter (`npm --prefix apps/mobile run lint`).
- [x] 4.2 Verify screen visual in iOS simulator with fresh screenshot.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
