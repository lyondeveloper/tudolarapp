# 0022 — gluestack is the design system

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0022** in the stack table
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:32-44`)

## Context

`AGENTS.md` (section "React") already recommends composing UI from **gluestack-ui** components rather
than ad-hoc styling, so the design system stays coherent. This record records that decision and its
rationale and cites `AGENTS.md` rather than restating it as a new rule
(`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:34`).

The token layer the client renders from is already specified in
`openspec/specs/mobile/design-system/spec.md`, and the mobile app's own conventions (colour in
`src/global.css`, typography in `src/theme/typography.ts`) are in `apps/mobile/AGENTS.md`. The tokens
are not duplicated here.

## Decision

gluestack is the design system, **consumed through the token layer**
(`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:41`):

- The design-system specification is `openspec/specs/mobile/design-system/spec.md`; it — not this
  record — is the source of the palette, typography, spacing, radius, and elevation tokens.
- This record **points at that spec rather than duplicating its tokens**; a token change is made in
  the spec and its token layer, not here.

## Consequences

- UI is composed from gluestack-ui components and the approved roles, not from literal or ad-hoc
  values (`AGENTS.md`, section "React"; `apps/mobile/AGENTS.md`, section "Design system").
- The token contract is owned by the design-system spec; this ADR does not restate the values.
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **Ad-hoc styling per screen.** Rejected: `AGENTS.md` (section "React") recommends gluestack so the
  design system stays coherent.
- **A second component library beside gluestack.** Rejected: it would fragment the design system and
  duplicate the token layer.
- **Duplicating the tokens in this record.** Rejected: `openspec/specs/mobile/design-system/spec.md`
  is the source of the tokens.
