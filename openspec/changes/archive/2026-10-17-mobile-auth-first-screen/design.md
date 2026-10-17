# Design

## Context

See proposal.md — Why. Requirements are in `specs/mobile/app-shell/spec.md`.

Current state that shapes the approach:

- `apps/mobile` is Expo ~57 with expo-router, so routes are files under `src/app/`. `_layout.tsx`
  is the root layout; `index.tsx`, `explore.tsx`, and `sign-in.tsx` are routes, and
  `components/app-tabs.tsx` renders a `NativeTabs` bar linking all three.
- The Redux session slice holds only `accessToken` and `userId`. Session restore runs in
  `useRestoreSession()`, which exchanges a stored refresh token for a new pair, and is currently
  invoked in the root layout above the Redux `Provider` (see below).
- `apps/mobile` has no test runner: no Jest config, no `test` script, and no test files. The only
  static checks are `tsc --noEmit` and `expo lint`.
- `openspec/specs/` is empty, so `mobile/app-shell` is a new capability and there is no existing
  mobile spec to reconcile with.

Two defects were already corrected while bringing the app up, before this change was written.
They are prerequisites for the shell to run at all, and are recorded here rather than silently
bundled:

1. `babel.config.js` aliased only `@` → `./src`, while `tsconfig.json` also declares
   `@/assets/*` → `./assets/*`. Metro therefore resolved `@/assets/...` into `src/assets/...`
   and the bundle failed, even though `tsc` passed. Fixed by adding the `@/assets` alias ahead of
   `@`.
2. `src/app/_layout.tsx` called `useRestoreSession()` in the layout body, above the
   `<Provider store={store}>` it renders. React context flows downward, so `useAppDispatch()`
   threw "could not find react-redux context value" at render. Fixed by moving the call into a
   child rendered inside the provider.

## Goals / Non-Goals

**Goals:**

- One clear answer to "what does the app show first", driven by session state rather than by the
  router's default file ordering.
- A shell that survives the next change: the placeholder screen is a real route, so T15/T17 can
  replace it without reworking navigation.
- A mobile test runner that can fail on render-time errors, because `tsc` and `expo lint` cannot.

**Non-Goals:**

- Choosing the final navigation model for the product (tabs vs stack vs drawer). That belongs to
  T15, which implements the approved Stitch design.
- Restyling the sign-in screen or introducing design tokens.
- Offline behaviour, refresh-on-resume, or logout UI.

## Decisions

**Route on an explicit session status, not on the presence of a token.** The slice gains
`status: 'restoring' | 'anonymous' | 'authenticated'`, starting at `restoring`. Restoration is
asynchronous, so inferring "anonymous" from a missing token would render sign-in and then jump to
the authenticated screen. The shell renders nothing while `restoring` and lets the native splash
stay up.
- Alternative considered: a `useEffect` in the layout that pushes to `/sign-in` when no token
  exists. Rejected: it is an Effect computing derived routing, and it reintroduces the flash.

**Keep expo-router and use a Stack plus per-screen guards.** The root layout renders the providers
and a `Stack`. Each screen guards itself: `RequireAnonymous` wraps sign-in and `RequireAuthenticated`
wraps the authenticated screen, and the entry route redirects on first load.
- Revised during implementation. The original decision put the redirect only on the entry route,
  which is wrong: once the user is on `/sign-in`, `/` is unmounted, so a successful sign-in would
  never have moved them to `/home` — the spec requires that it does. Guarding each screen keeps the
  rule declarative and independent of where the user currently is, and still avoids an Effect.
- Alternative considered: render `sign-in` or the placeholder conditionally inside `_layout.tsx`
  and drop the router for now. Rejected: it bypasses expo-router, breaks deep links, and has to be
  undone the moment a second screen appears.
- Alternative considered: a `useEffect` in the layout that calls `router.replace` when the status
  and the current segment disagree (the pattern Expo Router documents for auth). Rejected: it
  reintroduces Effect-driven navigation, and the guards cover both transitions without it.

**Make the restore transition explicit with `sessionRestoreStarted`.** The slice gains an action
that returns the session to `restoring` and drops any token, and `useRestoreSession` dispatches it
when the effect starts.
- Needed for two reasons. It states the real launch transition instead of leaving it implicit in
  the initial state, and it lets a test re-enter the state a real launch starts in, because the
  Redux store is a module singleton that would otherwise carry a resolved session between tests.

**Delete the tab navigator rather than keep tabs with sign-in first.** A tab bar models
destinations; sign-in is a gate, as the existing `app-tabs.tsx` comment already states. With one
real screen, a tab bar is noise.
- Alternative considered: keep `NativeTabs` with a single sign-in trigger. Rejected: a one-tab bar
  is not navigation, and the placeholder would need a second tab that T15 will redesign anyway.

**Add `jest-expo` + `@testing-library/react-native` as the mobile test runner.** `jest-expo` is
the Expo-maintained preset that wires the React Native transform, and React Native Testing
Library tests rendered output rather than component internals, which is what the shell specs
describe.
- Alternative considered: Vitest with a React Native preset. Rejected: less established for RN,
  and the project already uses Jest on the API side, so one test vocabulary is preferable.
- Alternative considered: no runner, verify by screenshot. Rejected by the product owner: a
  screenshot cannot be re-run in CI, and the audit showed static checks miss render failures.

**Drive post-sign-in navigation from session status, not from the form.** `useSignInForm`
dispatches `sessionEstablished` on success and the gate reacts. The form stays free of navigation
calls, and a restored session follows the same path as a fresh sign-in.
- Alternative considered: `router.replace('/home')` inside the submit handler. Rejected: it
  duplicates the routing rule and desynchronises if the session is restored instead.

**Read the placeholder profile through the existing RTK Query endpoint.** The authenticated screen
uses `useCurrentUserQuery()`, which already targets `GET /users/me` and provides the
`CurrentUser` tag. No new server-state cache is introduced; README and AGENTS.md name RTK Query as
the only one.
- Alternative considered: fetch in an Effect. Rejected: it duplicates the cache and the loading /
  error handling RTK Query already provides.

**Delete the template set as one closed dependency group.** Every component and asset slated for
removal is referenced only by another file in the same set, verified by import analysis, so the
removal is atomic. `constants/theme.ts` and `hooks/use-theme.ts` fall into the group once their
template importers are gone.

## Risks / Trade-offs

- [Removing the tab bar leaves one route, so navigation is barely exercised] → the placeholder is
  a distinct route reached through the Stack, so the gate and the router are both covered by
  tests. T15 replaces the model.
- [The `restoring` status renders nothing for a frame] → the native splash from
  `expo-splash-screen` remains visible until `status` leaves `restoring`; the shell returns `null`
  rather than a placeholder screen, so nothing flashes.
- [`jest-expo` may need `transformIgnorePatterns` tuning for gluestack and uniwind] → the first
  tests target the session slice and the gate, which do not need the uniwind CSS pipeline. If a
  module must be mocked, the reason is recorded next to the mock rather than hidden in config.
- [The two defect fixes predate this change and were not reviewed as part of it] → they are
  listed explicitly in the proposal and design, with file paths and the failure each caused, and
  the tasks record them as pre-apply work so a reviewer can inspect the diff directly.
- [The placeholder screen is throwaway] → it is deliberately minimal and marked as such in code,
  so T15/T17 can delete it without untangling anything.
- [`expo-router/testing-library` only supports one `renderRouter` per test file] → `renderRouter`
  calls `jest.useFakeTimers()` and reads the route from a module-level router store it never resets,
  so a second render in the same file asserts against the previous test's route. Each shell scenario
  therefore lives in its own spec file. This is a property of the library, not of the app, and it is
  documented at the top of both shell specs.
- [The shell specs are timing-sensitive] → the restore resolves through secure storage, RTK Query,
  and a mocked `fetch`, and `waitFor` runs against fake timers. Two failures were observed
  immediately after Metro/watchman churn and none in fifteen consecutive runs afterwards. If it
  recurs, the fix is to assert on the store's session status before the route, rather than to widen
  the timeout.
- [Deleting files is irreversible in a working tree] → everything removed is tracked in git, and
  the change is a single commit that can be reverted.

## Migration Plan

No data or schema migration; this is a mobile-client change with no production surface. Rollback
is `git revert` of the change commit, which restores every deleted file. The only deployment
consideration is that the app must be rebuilt after the removal, because the deleted assets were
bundled into the previous build.

## Open Questions

- Whether the authenticated placeholder should surface phone-verification or market context is
  deferred to T15/T16. It does not change the specs, the approach, or the task breakdown, because
  the placeholder is replaced wholesale.
