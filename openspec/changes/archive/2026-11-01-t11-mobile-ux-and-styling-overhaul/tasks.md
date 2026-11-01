# Tasks

## 1. Sign-in Screen & Form Modernization (TDD Red-First)

- [x] 1.1 Update `apps/mobile/src/__tests__/sign-in-tokens.spec.tsx` and `apps/mobile/src/features/auth/sign-in-form.spec.tsx` to assert new Stitch 1.1 elements: hero trust card, guest exploration link (`sign-in-guest-browse`), and modern input styling (`npm --prefix apps/mobile test -- apps/mobile/src/features/auth/sign-in-form.spec.tsx --watchman=false`).
- [x] 1.2 Implement the modernized `SignInForm` in `apps/mobile/src/features/auth/sign-in-form.tsx` and `apps/mobile/src/app/sign-in.tsx` with header branding, hero trust card (`Cifrado Local`, `Puntos Céntricos`, `Sin Custodia`), elevated card layout, 50px input targets, and guest browse link. Verify tests pass.

## 2. Marketplace Discovery for Guests & Bottom Dock Positioning

- [x] 2.1 Update `apps/mobile/src/__tests__/home-marketplace.spec.tsx` to assert guest discovery behavior on `/home` when unauthenticated and verify failing test (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/home-marketplace.spec.tsx --watchman=false`).
- [x] 2.2 Update `apps/mobile/src/app/home.tsx` to allow guest viewing without mandatory session redirect, render a guest welcome prompt when unauthenticated, and anchor `<BottomDock>` at the bottom of the viewport with safe area bottom padding. Verify tests pass.

## 3. App Shell Navigation & Test Alignment

- [x] 3.1 Update `apps/mobile/src/__tests__/app-shell.anonymous.spec.tsx` and related specs to align with the enhanced `/sign-in` presentation and guest exploration navigation (`npm --prefix apps/mobile test -- apps/mobile/src/__tests__/app-shell.anonymous.spec.tsx --watchman=false`).
- [x] 3.2 Run complete mobile test suite and linter (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2 && npm --prefix apps/mobile run lint`).

## Workflow follow-up

- Archive change with `openspec archive t11-mobile-ux-and-styling-overhaul --yes`.
- Open PR for T11, squash and merge into main.
