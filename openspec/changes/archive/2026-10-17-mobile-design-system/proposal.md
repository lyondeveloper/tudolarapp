# Proposal

## Why

The mobile client already has a token layer, but it holds placeholder values. `src/global.css`
defines CSS variables in a generic shadcn-shaped set (`--primary: 23 23 23`, greys) and maps them
to Tailwind utilities that every gluestack component consumes through class names
(`bg-primary`, `text-primary-foreground`, `border-border`). The app therefore renders in dark mode
with near-black and grey tokens that belong to no design.

The approved Stitch design system, **Civic Trust Exchange**, specifies something entirely
different: light mode, institutional deep blue `#0F4C81`, emerald sage `#059669`, preventative
amber `#D97706`, slate neutrals, a Plus Jakarta Sans typography scale, and explicit
component-level values for buttons, inputs, chips, cards, badges, and elevation.

Until the token layer carries the brand, every screen built on it is wrong, and each of T15–T19
would otherwise invent its own values. Populating the layer is the smallest change that makes the
whole design usable, and it needs no product decisions.

## What Changes

- Populate the existing token layer with the Civic Trust Exchange values, **keeping the variable
  names the gluestack components already reference** so the library keeps working unchanged.
- Add the brand semantics the design needs and the current set lacks: surface and elevation levels
  0–3, `on-primary` / `on-secondary`, the amber warning set (`#FEF3C7` / `#F59E0B` / `#92400E`),
  the affirmative action colour `#059669`, `outline` / `outline-variant`, slate muted text
  `#64748B`, and the radius and spacing scales.
- Add the typography scale — `headline-xl` through `label-sm`, plus `code-num` for tabular money
  values — and load Plus Jakarta Sans through `expo-font`.
- Make **light the default mode** and keep the existing `@variant dark` block as a documented seam,
  so a dark palette can be authored later without reworking components.
- Convert the two existing screens (sign-in and the authenticated placeholder) to consume the
  tokens, so the system is proven end to end instead of merely declared.
- Correct the stale comment in `global.css` that points at a nativewind config which does not exist.

## Capabilities

### New Capabilities

- `mobile/design-system`: the token layer the mobile client renders from — palette, typography,
  spacing, radius, elevation, and the component-level semantics that components consume.

### Modified Capabilities

None. `mobile/app-shell` describes routing and session behavior, which the token values do not
change; its requirements stay as they are.

## Impact

- `apps/mobile/src/global.css` — the token values, plus the new tokens and their Tailwind mappings.
- `apps/mobile/src/components/ui/gluestack-ui-provider/index.tsx` — default mode becomes light.
- `apps/mobile/src/app/_layout.tsx` — stop forcing dark mode.
- `apps/mobile/src/features/auth/sign-in-form.tsx`, `apps/mobile/src/app/sign-in.tsx`, and
  `apps/mobile/src/app/home.tsx` — consume the tokens.
- New: a typography token module and font loading at the root layout.
- `apps/mobile/package.json` — adds `@expo-google-fonts/plus-jakarta-sans` (0.4.2, published
  2025-09-11, so well past the project's release-age bar). `expo-font` is already a dependency.
- `apps/mobile/AGENTS.md` and `apps/mobile/README.md` — document where tokens live and how a
  component consumes them.
- No `apps/api`, schema, or contract change.

### Out of scope

- **Building the Stitch screens.** Offers, search, chat, exchange, and seller flows are T15–T19.
  This change makes the tokens available; it does not create the screens.
- **Implementing the design's component specs as new components.** Offer cards, filter chips, the
  bottom navigation dock, and the safety modal are described in the design, but they arrive with
  the screens that need them. This change covers the token layer they will be built from.
- **Authoring a dark palette.** The seam is preserved; no dark values are designed here.
- **Changing any behavior covered by `mobile/app-shell`.** Routing, session states, and screen
  selection are untouched.
- The remaining T00 findings (F-3 documentation contradiction, F-4 missing `CREATE EXTENSION`,
  F-5 empty layer directories, F-6 out-of-sequence backlog) are not addressed here.

### Source

Not derived from a Notion backlog task. This is an out-of-sequence foundation slice that the
product owner requested while evaluating the app, and a prerequisite for T15 (bring the Stitch
design into the mobile app). The design is the approved Stitch project "TUDOLAR P2P Marketplace
Prototype" and its design system "Civic Trust Exchange".
