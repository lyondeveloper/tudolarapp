# Tasks

## 1. Decouple Registration from Municipal Node

- [x] 1.1 Update `apps/mobile/src/features/auth/register-form.spec.tsx` and `apps/mobile/src/__tests__/register-screen.spec.tsx` to assert that municipal sector selectors are omitted and verify failing test (`npm --prefix apps/mobile test -- apps/mobile/src/features/auth/register-form.spec.tsx --watchman=false`).
- [x] 1.2 Remove `CIUDAD_OJEDA_CORRIDORS` and `frequentSector` from `apps/mobile/src/features/auth/register-form.tsx` and `apps/mobile/src/features/auth/use-register-form.ts`, and verify tests pass (`npm --prefix apps/mobile test -- apps/mobile/src/features/auth/register-form.spec.tsx --watchman=false`).

## 2. Implement Profile Editing in `/profile`

- [x] 2.1 Update `apps/mobile/src/__tests__/profile-screen.spec.tsx` to assert the presence and interaction of the "Editar Perfil" action and modal, and verify failing test (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/profile-screen.spec.tsx --watchman=false`).
- [x] 2.2 Implement the "Editar Perfil" button, form, and modal in `apps/mobile/src/app/profile.tsx` allowing modification of `displayName` and `phoneNumber`. Verify tests pass (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/profile-screen.spec.tsx --watchman=false`).

## 3. Full Verification

- [x] 3.1 Run full mobile test suites (`npm --prefix apps/mobile test -- --watchman=false`) and linter (`npm --prefix apps/mobile run lint`).
- [x] 3.2 Capture updated screenshots of `/register` and `/profile` in the simulator.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
