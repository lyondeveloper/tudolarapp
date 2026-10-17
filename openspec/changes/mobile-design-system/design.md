# Design

## Context

See proposal.md — Why. Requirements are in `specs/mobile/design-system/spec.md`.

The token mechanism already exists and is the reason this change is small:

- `apps/mobile/src/global.css` is the single token source. It declares CSS variables inside
  `@layer theme { :root { @variant light { … } @variant dark { … } } }` as **space-separated RGB
  triplets** (`--primary: 23 23 23`), then maps them to Tailwind colour utilities in
  `@theme inline` (`--color-primary: rgb(var(--primary))`), which is what makes `bg-primary`,
  `text-primary-foreground`, and `border-border` resolvable.
- `apps/mobile/metro.config.js` wires that file as the uniwind entry
  (`withUniwindConfig({ cssEntryFile: './src/global.css', dtsFile: './uniwind-types.d.ts',
  extraThemes: ['dark'] })`).
- Every gluestack component already consumes those variables **through class names**. For example
  `src/components/ui/button/index.tsx` styles its `default` variant as
  `bg-primary … ` with `text-primary-foreground`, its `outline` variant as
  `border border-border bg-background`, and its `destructive` variant as `bg-destructive`. None of
  them hard-code a colour.
- `src/components/ui/gluestack-ui-provider/index.tsx` accepts `mode: 'light' | 'dark' | 'system'`
  and calls `Uniwind.setTheme(mode)`; it defaults to `'dark'`, and `src/app/_layout.tsx` passes
  `mode="dark"` explicitly.
- There is **no** `tailwind.config.*` or nativewind config file. A comment in `global.css` claims
  its values "match the nativewind config.ts tokens", which is stale: nothing else defines tokens.
- `expo-font` is already a dependency; no `@expo-google-fonts` package is declared.

So the values are placeholder greys and the mode is forced dark, while the approved design system
("Civic Trust Exchange") is light with a specific brand palette, typography scale, and
component-level values.

## Goals / Non-Goals

**Goals:**

- Make the existing token layer carry the approved brand, so the gluestack component library
  renders the brand without any component being rewritten.
- Give the design's semantics a name each, so screens ask for a role rather than a hex value.
- Prove the layer end to end by converting the two screens that exist.
- Leave the mechanism obvious to the next reader: one file defines tokens, one module defines type.

**Non-Goals:**

- Designing a dark palette. Only the seam is preserved.
- Building the Stitch screen layouts. The sign-in screen's passkey-first structure, its civic
  notices, and its market pill are T15's work; this change only makes the screen token-driven.
- Replacing gluestack as the component source, or adding a second styling engine.

## Decisions

**Put the brand values in the existing CSS variable layer, not in a parallel TypeScript theme.**
Every gluestack component already resolves through these variables, so replacing the values
re-skins the whole library at once. Adding a TS theme object alongside would create two sources of
truth and require touching every component.
- Alternative considered: a `src/theme/` module of TS constants plus a `useTheme` hook. Rejected:
  it duplicates the layer, and components styled with `tva` class names cannot read it.

**Preserve the existing variable names and add new ones.** gluestack's variants reference
`--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--background`,
`--foreground`, `--card`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`,
`--border`, `--input`, `--ring`, and `--destructive` by name. Renaming any of them silently breaks
a component variant, so the brand values are mapped onto those names and the design's extra
semantics (`on-primary`, `warning`, `warning-border`, `warning-foreground`, `success`, `outline`,
`outline-variant`, and the surface levels) are added as new ones.

**Keep the values as space-separated RGB triplets.** The mapping is `rgb(var(--token))`, so a hex
like `#0F4C81` is stored as `15 76 129`. Writing hex directly into the variable would make every
`rgb(var(--token))` mapping invalid.

**Use the authored brand palette; do not expose the generated Material 3 roles.** Stitch ships two
palettes that disagree: the authored `styleGuidelines` prose and component specs name
`#0F4C81` / `#059669` / `#D97706` with slate neutrals, while the generated `namedColors` /
`designMd` colours use `#00355f` / `#006c4a` / `#522900` with blue-tinted surfaces. The component
specs describe the screens in terms of the authored values, so those win. The M3 set is recorded
here and deliberately left unexposed, so a later reader does not reintroduce it as a second palette.
- Consequence to accept: the base canvas is the authored `#F8FAFC` from the layout section rather
  than `designMd`'s `surface: #f8f9ff`. This is a two-value difference in one token; if the design
  owner prefers the blue-tinted canvas it is a one-line change.

**Light is the default, and the dark block stays.** The provider's default becomes `light` and the
root layout stops passing `dark`. The `@variant dark` block is kept and remains reachable through
the provider's `mode`, which is the documented seam.
- Alternative considered: delete the dark block. Rejected: the seam is what makes adding a dark
  palette later a values-only change.

**Typography ships as a TypeScript module; colour, radius, and spacing stay in CSS.** The design's
scale carries `fontSize`, `fontWeight`, and `lineHeight` per level, which React Native text styles
need as numbers, and the typeface is loaded at runtime by `expo-font` so its family name is only
known in JS. Colours, radii, and spacing are already expressible as Tailwind utilities and belong
in the CSS layer.
- Alternative considered: express the scale through Tailwind's `--text-*` theme keys. Deferred
  rather than rejected: whether uniwind resolves those keys is unverified, so the module is the
  safe path and the CSS route can be added later without changing callers.
- Alternative considered: bundle the TTF files. Rejected: binary assets in git with no version
  tracking, when `@expo-google-fonts/plus-jakarta-sans` is versioned and long-published.

**Convert the two existing screens but do not redesign them.** Sign-in and the authenticated
placeholder adopt tokens (`bg-background`, `text-foreground`, `bg-primary`,
`text-primary-foreground`, and the amber notice role for the non-custody disclaimer) so the layer
is exercised by real screens and its gaps surface now. Their structure is unchanged; T15 owns the
Stitch layout.

**Correct the stale comment rather than the mechanism.** `global.css` claims a nativewind config
defines matching tokens; none exists. The comment is replaced with an accurate description of the
layer, because a wrong comment about the single source of truth is worse than no comment.

## Risks / Trade-offs

- [Overriding Tailwind's default scale can shift every component at once] → the design's radius
  and spacing values are close to Tailwind's defaults, so the blast radius is small, and the two
  converted screens plus the existing shell specs catch anything obviously wrong. Each override is
  recorded with the design value it comes from.
- [The two Stitch palettes disagree] → resolved by the authored-brand rule and recorded above and
  in the proposal, so T15 has one answer instead of a choice to re-litigate.
- [Loading a font adds a launch dependency] → the shell already holds the native splash while the
  session status is `restoring`; font loading joins that gate so no screen renders in a fallback
  face and then reflows.
- [Changing to light may expose component classes that only look right in dark] → gluestack's
  `dark:` variants only apply in dark presentation, so the light path is the plainer one; the
  converted screens are reviewed in light on the simulator.
- [Asserting exact colours in tests is brittle if it reads resolved style objects] → the specs
  assert the roles a screen uses and the token values themselves, rather than every computed style,
  so a value change updates one assertion instead of many.
- [The design's full component specs (offer cards, chips, bottom dock, safety modal) are not built
  here] → they arrive with the screens that need them; this change names the tokens they will use
  so T15 does not invent values.
- [Jest cannot resolve uniwind class names to styles] → `jest.style-mock.js` stubs stylesheet
  imports, so `className="bg-primary"` yields no `backgroundColor` in a test and resolved colours
  cannot be asserted there. The contract is therefore verified at the token source — a unit test
  reads `global.css` and asserts the approved values — and at role usage in the converted screens,
  with the visual result confirmed on the simulator. Duplicating the palette into a TypeScript
  module purely to make it assertable was rejected as a second source of truth.

## Migration Plan

No data or schema migration; this is a mobile-client presentation change with no production
surface. Rollback is `git revert` of the change commit, which restores the previous token values.
The only deployment note is that the app must be rebuilt, because the font is bundled through the
native build.

## Open Questions

- Whether uniwind resolves Tailwind's `--text-*` theme keys. It does not change the specs, the
  approach, or the tasks: the TypeScript typography module is the plan, and the CSS route would be
  an additive refinement.
