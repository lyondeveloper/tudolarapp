# Proposal

## Why

The mobile client boots into the Expo starter template. The first screen a user sees is a
"Welcome to Expo" placeholder, and the app's only real capability — signing in — sits behind a
tab that the code itself annotates as a scaffold placeholder. A fresh install therefore presents
Expo branding instead of TUDOLAR, and the template's components and assets remain as dead weight
that a reader must rule out before trusting the codebase.

T00 also showed that the app was never actually run: typecheck and lint both passed while the
bundle failed to build and the root layout crashed at render. The shell needs a test runner that
can fail on render-time errors, because the static checks that exist cannot.

## What Changes

- **BREAKING** (developer workflow): the app's initial screen becomes sign-in. The `index` and
  `explore` template screens are removed, together with the tab navigator that linked them.
- Remove the Expo starter-template code and assets that exist only to serve those screens:
  `animated-icon` (and its `.web` variant and CSS module), `hint-row`, `web-badge`,
  `external-link`, `ui/collapsible`, `themed-text`, `themed-view`, `app-tabs` (and `.web`), the
  template images (`expo-logo`, `logo-glow`, `react-logo*`, `tutorial-web`, `expo-badge*`,
  `tabIcons/`), the default Expo `README.md`, and the `reset-project` script.
- Add a minimal authenticated placeholder screen so a successful sign-in has a destination. It
  shows the current user read from `GET /users/me` and is replaced by the real home in T15/T17.
- Make the session state explicit (`restoring` / `anonymous` / `authenticated`) so the shell can
  decide which screen to show without flashing the wrong one during session restore.
- Add a mobile test runner (`jest-expo` + `@testing-library/react-native`) with a `test` script,
  and cover the shell behavior with real render tests.
- Record two defects that blocked the shell entirely and were already corrected while bringing
  the app up: the `@/assets/*` alias missing from the Babel resolver, and `useRestoreSession()`
  being called above the Redux `Provider` it depends on.

## Capabilities

### New Capabilities

- `mobile/app-shell`: how the mobile client boots, which screen it presents first, and how it
  routes between the unauthenticated and authenticated states.

### Modified Capabilities

None. `openspec/specs/` is still empty, so there is no existing capability to modify.

## Impact

- `apps/mobile/src/app/` — `_layout.tsx` becomes a provider + Stack shell that routes on session
  state; `sign-in.tsx` stays as the unauthenticated screen; a new authenticated placeholder
  screen is added; `index.tsx` and `explore.tsx` are deleted.
- `apps/mobile/src/features/session/` — `session-slice.ts` and `use-restore-session.ts` gain the
  explicit session status.
- `apps/mobile/src/components/` — nine template components deleted; `constants/theme.ts` and
  `hooks/use-theme.ts` are deleted too if nothing outside the template still imports them.
- `apps/mobile/assets/images/` — the template images deleted; the app icon and splash assets stay.
- `apps/mobile/package.json`, `jest.config.js` (new), `apps/mobile/README.md` — test runner added,
  template script removed, default Expo readme replaced.
- No API, database, or `apps/api` change. No new runtime dependency; the test runner is a
  devDependency.

### Out of scope

- No new product capability beyond the shell: no market selection, registration, password
  recovery, refresh-on-resume, or logout UI. Those belong to T16.
- No Stitch design implementation and no visual redesign. The sign-in form keeps its current
  gluestack markup; this change moves and removes screens, it does not restyle them.
- No change to `apps/api`, its contracts, or its tests.
- The remaining T00 findings (F-3 documentation contradiction, F-4 missing `CREATE EXTENSION`,
  F-5 empty layer directories, F-6 out-of-sequence backlog) are not addressed here.

### Source

Not derived from a Notion backlog task. This is an out-of-sequence slice that the product owner
requested directly while evaluating the app; it is a prerequisite for T15 (bring the Stitch
design into the app) and overlaps T16 (mobile authentication). The backlog's sequential rule is
already broken by T03, which T00 recorded as finding F-6.
