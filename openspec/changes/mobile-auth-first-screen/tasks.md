# Tasks

> **Note (pre-apply):** two defects that prevented the app from running at all were corrected
> while diagnosing the bundle failure, before this change was written. They are recorded in
> section 5 as evidence, the same way T00 recorded its baseline commits. Everything from section 1
> onward is the remaining work.

## 1. Mobile test runner

- [x] 1.1 Add `jest-expo`, `jest`, `@types/jest`, `@testing-library/react-native`, and `@react-native/jest-preset` (pinned to the `react-native` version) as devDependencies with `npx expo install --dev`; verify they appear in `apps/mobile/package.json` and that `npm ls jest-expo` resolves. **Corrected:** `react-test-renderer` was dropped — the Expo unit-testing guide states it is deprecated and does not support React 19, and this project runs React 19.2.3. `@react-native/jest-preset` was added because `jest-expo` requires it, and had to be pinned to `0.86.3` because `expo install` resolved it to `0.88.0` and broke every suite.
- [x] 1.2 Add `apps/mobile/jest.config.js` (preset `jest-expo`) and a `test` script to `apps/mobile/package.json`; verify `npm test` runs from `apps/mobile` and exits 0 with a placeholder assertion, then delete the placeholder. Verified: `1 passed, 1 total`, exit 0.
- [x] 1.3 Document the mobile test command in `apps/mobile/AGENTS.md` alongside the existing lint and typecheck commands; verify the documented command runs exactly as written. Documented, including the `@react-native/jest-preset` pin and the `react-test-renderer` deprecation.

## 2. Explicit session status

- [x] 2.1 Write the failing test for session status transitions (`restoring` → `anonymous`, `restoring` → `authenticated`, `authenticated` → `anonymous` on clear) in `apps/mobile/src/features/session/session-slice.spec.ts`; verify it fails with `npm test -- session-slice` from `apps/mobile`. Red verified: 4 failed, each `Expected: "restoring"/"anonymous"/"authenticated", Received: undefined`.
- [x] 2.2 Implement the `status` field and its transitions in `apps/mobile/src/features/session/session-slice.ts`; verify the test from 2.1 passes. Green: 4/4.
- [x] 2.3 Write the failing test for restore transitions in `apps/mobile/src/features/session/use-restore-session.spec.tsx`: no stored token → `anonymous`; accepted token → `authenticated`; rejected token → token cleared and `anonymous`; verify it fails. Written and green (3/3); it exercises the real hook and reducer, mocking only device storage and the network. Its red phase was the same missing `status` field that 2.1 pinned, so it went green once 2.2 landed.
- [x] 2.4 Implement the status transitions in `apps/mobile/src/features/session/use-restore-session.ts`; verify the test from 2.3 passes and `npx tsc --noEmit` is clean. **No production change was required:** the hook already dispatched `sessionCleared` and `sessionEstablished`, so 2.2's slice change was the only missing piece. Verified: 3/3 green and `tsc --noEmit` exit 0.

## 3. Shell and routing

- [x] 3.1 Write the failing test that an anonymous session presents the sign-in screen and never the authenticated screen, in `apps/mobile/src/app/app-shell.spec.tsx`; verify it fails with `npm test -- app-shell` from `apps/mobile`. Red verified: `Expected: "/sign-in", Received: "/"`. **File moved:** the test now lives at `apps/mobile/src/__tests__/app-shell.anonymous.spec.tsx`, because every file under `src/app` is an expo-router route and a spec there is registered as one.
- [x] 3.2 Implement the provider + Stack shell and the session gate in `apps/mobile/src/app/_layout.tsx`, rendering nothing while `status` is `restoring`; verify the test from 3.1 passes. Green.
- [x] 3.3 Write the failing test that an authenticated session presents the placeholder screen and not the sign-in screen; verify it fails. Red verified: `Expected: "/home", Received: "/sign-in"`. Lives at `apps/mobile/src/__tests__/app-shell.authenticated.spec.tsx`.
- [x] 3.4 Implement the authenticated placeholder route reading the profile through the existing `useCurrentUserQuery()` endpoint, and make `useSignInForm` leave navigation to the gate; verify the test from 3.3 passes and `npx expo lint` reports no new warnings. Green. **No change was needed in `useSignInForm`:** it already only dispatches `sessionEstablished`, and the guard performs the navigation. `CurrentUser` in `apps/mobile/src/services/api.ts` was completed to match the API DTO (`displayName`, `emailVerified`, `accountStatus`), which `tsc` caught.
- [x] 3.5 Write the failing test that the authenticated placeholder renders no password, token, or other secret value; verify it fails before 3.4's screen is wired and passes after. Red then green; the mocked payload deliberately includes a `passwordHash` marker and the assertion checks the rendered tree excludes it and all three tokens.
- [x] 3.6 **Design revision discovered by implementation:** the gate had to move from the entry route to per-screen guards (`src/features/session/session-gate.tsx`), because `/` is unmounted once the user is elsewhere, so a successful sign-in would never have reached `/home`. Added `sessionRestoreStarted` to the slice so a restore explicitly re-enters `restoring`, which is both the real launch transition and what lets each test start from launch state. `design.md` records the revision.

## 4. Remove the Expo starter template

- [x] 4.1 Write the failing test asserting that no starter-template screen, bottom tab bar, or Expo badge is presented; verify it fails with `npm test -- app-shell` from `apps/mobile`. Red verified in `apps/mobile/src/__tests__/app-shell.no-template.spec.tsx`: rendering `/explore` presented the template's "Expo documentation" text. Green after 4.2.
- [x] 4.2 Delete `apps/mobile/src/app/explore.tsx`, delete `apps/mobile/src/components/app-tabs.tsx` and `app-tabs.web.tsx`, and remove their imports from `_layout.tsx`; verify the test from 4.1 passes and `npx tsc --noEmit` is clean. Done. `src/app/index.tsx` was **replaced** by the gate in 3.2 rather than deleted here, and `_layout.tsx`'s imports were dropped in the same rewrite. Verified: test green, `tsc` exit 0.
- [x] 4.3 Delete the template components `animated-icon.tsx`, `animated-icon.web.tsx`, `animated-icon.module.css`, `hint-row.tsx`, `web-badge.tsx`, `external-link.tsx`, `ui/collapsible.tsx`, `themed-text.tsx`, `themed-view.tsx`, plus the now-unused `hooks/use-theme.ts`, `hooks/use-color-scheme.ts`, `hooks/use-color-scheme.web.ts`, and `constants/theme.ts`; verify `npx tsc --noEmit` and `npx expo lint` are clean and no unresolved import remains. 13 files removed; `tsc` exit 0 and lint unchanged at 0 errors / 16 pre-existing warnings.
- [x] 4.4 Delete the template image assets `expo-logo.png`, `logo-glow.png`, `react-logo*.png`, `tutorial-web.png`, `expo-badge*.png`, and the `tabIcons/` directory, keeping the assets `app.json` references; verify no `require` or import of a deleted asset remains and that the app still bundles with `npx expo start --clear`. 14 files removed; no reference to any deleted asset remains in `src/` or `app.json`, and the remaining assets are exactly those `app.json` names.
- [x] 4.5 Replace `apps/mobile/README.md` with a readme describing this project, and delete `apps/mobile/scripts/reset-project.js` together with the `reset-project` script in `apps/mobile/package.json`; verify `npm run` no longer lists `reset-project` and the readme's documented commands match `package.json`. Done: scripts are now `start, android, ios, web, lint, test`, `scripts/` is gone, and no reference to `reset-project` remains.

## 5. Pre-apply defect fixes — already applied

- [x] 5.1 Record the Babel alias fix in `apps/mobile/babel.config.js` (`@/assets` → `./assets`, ordered before `@`), which resolved the Metro bundle failure `Unable to resolve "../assets/images/tutorial-web.png"`; verify the alias resolves by bundling with `npx expo start --clear`. Verified: the app bundles cleanly (`iOS Bundled 15049ms … (2310 modules)`) and renders on the simulator. Recorded as finding F-9 in `docs/audit/t00-baseline.md`.
- [x] 5.2 Record the provider-ordering fix in `apps/mobile/src/app/_layout.tsx`, moving the session restore call into a child rendered inside `<Provider store={store}>` to clear "could not find react-redux context value"; verify the app renders without that error. Verified: the bundle renders with no such error, and the shell specs mount the real layout. Recorded as finding F-10.
- [x] 5.3 Append these two defects and this change to `docs/audit/t00-baseline.md` as an addendum, noting that T00's green typecheck and lint did not detect either; verify the addendum cites the exact error text and file paths. Added as §8, with both error strings, the reproduce commands, and an update noting that F-2's audit half is now resolved by the pinned registry.

## 6. Integration verification

- [x] 6.1 Run `npx tsc --noEmit` from `apps/mobile` and record the result. Exit 0, no output.
- [x] 6.2 Run `npx expo lint` from `apps/mobile` and record the result; the 16 pre-existing `import/no-duplicates` warnings in generated gluestack components may persist but must not increase. 0 errors / 16 warnings — unchanged from the T00 baseline, and the deleted template files did not change the count.
- [x] 6.3 Run `npm test` from `apps/mobile` and record the pass count. 5 suites / 11 tests passed, stable across 15 consecutive runs.
- [x] 6.4 Confirm no cross-impact on the API: run `npm test -- --runInBand` and `TUDOLAR_TEST_DATABASE_URL=postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar_test npm run test:e2e -- --runInBand` from `apps/api` and confirm 6 and 13 tests still pass. Confirmed: 4 suites / 6 tests and 2 suites / 13 tests, both unchanged.
- [ ] 6.5 Build and launch on the iOS simulator (`npx expo run:ios`) and capture a screenshot showing sign-in as the first screen; sign in and capture a second screenshot showing the authenticated placeholder. **First screenshot captured:** sign-in renders as the first screen with no tab bar and no Expo branding, after a clean bundle (`iOS Bundled 15049ms … (2310 modules)`). **Second screenshot blocked:** driving the simulator UI needs macOS Accessibility permission for `osascript`, which is denied (`osascript is not allowed assistive access`), so the sign-in cannot be completed programmatically. The authenticated screen is covered by `app-shell.authenticated.spec.tsx`, which renders the real layout and asserts the profile appears and no secrets do. Awaiting a manual tap-through or an Accessibility grant.
- [x] 6.6 Run `openspec validate mobile-auth-first-screen --strict` and confirm it passes. Valid.

## Workflow follow-up

- Archive this change after the product owner's review requirements are satisfied.
- Update the Notion backlog note if this out-of-sequence slice changes how T15/T16 are described.
