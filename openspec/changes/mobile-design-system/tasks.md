# Tasks

## 1. Token layer

- [ ] 1.1 Write the failing token-contract test in `apps/mobile/src/theme/design-tokens.spec.ts` that reads `apps/mobile/src/global.css` and asserts the approved values are present for the required roles in the light variant — primary, on-primary, secondary, success, the warning set, outline, outline-variant, the surface levels, and the muted foreground — and that each value is a space-separated RGB triplet rather than a hex; verify it fails with `npm test -- design-tokens` from `apps/mobile`.
- [ ] 1.2 Replace the placeholder values in `global.css` with the approved brand values and add the new semantic roles plus their `@theme inline` colour mappings, keeping every variable name the gluestack variants already reference; verify the test from 1.1 passes.
- [ ] 1.3 Add the radius and spacing scale from the design, mapping each value onto the utility names gluestack already uses; verify `npx tsc --noEmit` is clean, `npx expo lint` reports no new warnings, and the existing shell specs still pass.
- [ ] 1.4 Replace the stale `global.css` comment that points at a non-existent nativewind config with an accurate description of the layer, and document in `apps/mobile/AGENTS.md` where tokens live and how a component consumes a role; verify every path and token name named in the documentation exists in `global.css`.

## 2. Typography

- [ ] 2.1 Add `@expo-google-fonts/plus-jakarta-sans` with `npx expo install --dev`-style resolution so the version is pinned deliberately, and confirm `expo-font` remains the loader; verify the package appears in `apps/mobile/package.json` and resolves from `node_modules`.
- [ ] 2.2 Write the failing test for the scale in `apps/mobile/src/theme/typography.spec.ts`, asserting each approved level's size, weight, and line height, the typeface name, and that the numeric style uses tabular figures; verify it fails with `npm test -- typography` from `apps/mobile`.
- [ ] 2.3 Implement `apps/mobile/src/theme/typography.ts` from the approved scale; verify the test from 2.2 passes.
- [ ] 2.4 Load the typeface in the root layout and hold the native splash until both the font and the session status are ready; verify the shell specs still pass and the app launches on the simulator without text reflowing from a fallback face.

## 3. Light presentation

- [ ] 3.1 Write the failing test asserting the default presentation is light in `apps/mobile/src/theme/presentation.spec.ts`, by asserting the theme is set to `light` when the shell mounts without an explicit mode; verify it fails with `npm test -- presentation` from `apps/mobile`.
- [ ] 3.2 Change the provider default to `light` and stop passing `dark` from the root layout, leaving the dark block reachable through the provider's `mode`; verify the test from 3.1 passes and the shell specs still pass.

## 4. Convert the existing screens

- [ ] 4.1 Write the failing test asserting the sign-in screen is token-driven in `apps/mobile/src/__tests__/sign-in-tokens.spec.tsx`: the submit control uses the primary role, the screen uses the background and foreground roles, and no screen file contains a literal colour value; verify it fails with `npm test -- sign-in-tokens` from `apps/mobile`.
- [ ] 4.2 Convert `apps/mobile/src/features/auth/sign-in-form.tsx` and `apps/mobile/src/app/sign-in.tsx` to consume the roles and the typography scale, without changing their structure; verify the test from 4.1 passes.
- [ ] 4.3 Write the failing test asserting the authenticated placeholder is token-driven in `apps/mobile/src/__tests__/home-tokens.spec.tsx`: it uses the background, foreground, and heading roles and contains no literal colour value; verify it fails.
- [ ] 4.4 Convert `apps/mobile/src/app/home.tsx` to the roles and the typography scale; verify the test from 4.3 passes.
- [ ] 4.5 Update `apps/mobile/README.md` to describe the token layer, the typography module, and how to consume a role; verify every file path and command it names exists and runs.

## 5. Integration verification

- [ ] 5.1 Run `npx tsc --noEmit` from `apps/mobile` and record the result.
- [ ] 5.2 Run `npx expo lint` from `apps/mobile` and record the result; the 16 pre-existing `import/no-duplicates` warnings may persist but must not increase.
- [ ] 5.3 Run `npm test` from `apps/mobile` and record the pass count, including the shell specs inherited from `mobile/app-shell`.
- [ ] 5.4 Confirm no cross-impact on the API: run `npm test -- --runInBand` and `TUDOLAR_TEST_DATABASE_URL=postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar_test npm run test:e2e -- --runInBand` from `apps/api` and confirm 6 and 13 tests still pass.
- [ ] 5.5 Build and launch on the iOS simulator and capture a screenshot showing the light presentation with the brand palette on the sign-in screen.
- [ ] 5.6 Run `openspec validate mobile-design-system --strict` and confirm it passes.

## Workflow follow-up

- Archive this change after the product owner's review requirements are satisfied.
- Note for T15: the design's own component specs (offer cards, filter chips, the bottom navigation dock, and the safety modal) are not built here; T15 builds them on these tokens.
