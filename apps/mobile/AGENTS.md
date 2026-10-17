This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npm test                    # unit and render tests (jest-expo + @testing-library/react-native)
npm test -- <path>          # run one test file, e.g. npm test -- session-slice
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint, typecheck, and tests before declaring any task done.

### Jest preset version pin

`jest-expo` loads the React Native Jest preset from the separate
`@react-native/jest-preset` package, and `npx expo install` resolves that package to the latest
release rather than to the installed React Native version. A mismatch fails every suite with
`Could not locate module react-native/setup-env`. Keep `@react-native/jest-preset` pinned to the
exact `react-native` version in `package.json` (for example `0.86.3`), and re-pin it whenever
React Native is upgraded.

`react-test-renderer` is deprecated and does not support React 19, so it must not be added as a
direct dependency; `@testing-library/react-native` replaces it. `jest-expo` still pulls it in
transitively, which is why it appears in the tree.

## Design system

The approved design system is **Civic Trust Exchange** (the Stitch project "TUDOLAR P2P
Marketplace Prototype"). The client renders from it and does not carry colours of its own.

- **Colour lives in one file: `src/global.css`.** It declares the tokens as CSS variables and maps
  them to Tailwind utilities. No other file defines a colour, and there is no `tailwind.config.*`
  or nativewind config to keep in step.
- **Values are space-separated RGB triplets, not hex**, because the `@theme inline` block consumes
  them as `rgb(var(--token))`. Write `--primary: 15 76 129;`, never `--primary: #0F4C81;`.
- **Components consume roles through class names**, via `tva` in `src/components/ui/*`: use
  `bg-primary`, `text-primary-foreground`, `border-border`, `bg-surface`, `text-muted-foreground`,
  and the `warning` / `warning-border` / `warning-foreground` trio for notices. Never write a
  literal colour in a component or a screen.
- **Never rename an existing token.** The gluestack variants resolve these names by class name, so
  renaming one silently breaks a variant. Add a new role instead.
- **Light is the default presentation.** The `@variant dark` block is a seam: it keeps the dark
  presentation rendering, but no dark palette has been authored, so its brand roles mirror the
  light values. `GluestackUIProvider` drives the switch through `Uniwind.setTheme`.
- **Typography lives in `src/theme/typography.ts`.** Use `textStyle('<level>')` rather than ad-hoc
  sizes or weights. Each weight is loaded as its own family, so a level resolves to the family
  matching its weight; `code-num` additionally renders tabular figures for money.
- Note gluestack's `Heading` types its `style` prop through `@expo/html-elements`, whose web style
  clashes with React Native's `TextStyle`; the call site needs a narrow cast.

`npm test` covers the token contract in `src/theme/design-tokens.spec.ts`, which reads
`global.css` and asserts the approved values. Jest stubs stylesheets, so a rendered
`className="bg-primary"` carries no `backgroundColor` in a test — assert at the token source or on
role usage, never on resolved colours.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
