# Tasks

## 1. Decouple Node Context from Authentication (TDD Red-First)

- [x] 1.1 Update `apps/mobile/src/features/auth/sign-in-form.spec.tsx` to assert global TUDOLAR identity without municipal node banner (`npm --prefix apps/mobile test -- apps/mobile/src/features/auth/sign-in-form.spec.tsx --watchman=false`).
- [x] 1.2 Remove municipal node banner from `apps/mobile/src/features/auth/sign-in-form.tsx` and `apps/mobile/src/features/auth/register-form.tsx` and verify unit tests pass.

## 2. Five-Destination Bottom Dock & Profile Screen

- [x] 2.1 Update `apps/mobile/src/features/marketplace/components/bottom-dock.tsx` to add `Perfil` (`/profile`, `dock-profile`) and update `bottom-dock.spec.tsx` (`npm --prefix apps/mobile test -- apps/mobile/src/features/marketplace/components/bottom-dock.spec.tsx --watchman=false`).
- [x] 2.2 Add unit test for `ProfileScreen` in `apps/mobile/src/__tests__/profile-screen.spec.tsx` asserting account details, verification badges, seller eligibility, active node switcher, and logout (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/profile-screen.spec.tsx --watchman=false`).
- [x] 2.3 Implement `ProfileScreen` in `apps/mobile/src/app/profile.tsx` with authenticated and guest views, and verify unit tests pass.

## 3. Verification & Quality Gates

- [x] 3.1 Run complete mobile test suite and linter (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2 && npm --prefix apps/mobile run lint`).

## Workflow follow-up

- Archive change with `openspec archive t12-global-identity-and-user-profile --yes`.
- Open PR for T12, squash and merge into main.
