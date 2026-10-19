# 0024 — React Native + Expo is the mobile client

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0024** in the stack table
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:32-44`)

## Context

`AGENTS.md` (section "Product context") already states the target architecture: a React Native + Expo
mobile client with gluestack UI, RTK Query for server state, Redux Toolkit for client state, and React
Hook Form for forms. This record records that decision and its rationale and cites `AGENTS.md` rather
than restating it as a new rule (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:34`).

The client has its own conventions, which live in `apps/mobile/AGENTS.md` (Expo's versioned docs, Expo
Router, EAS builds, the jest-preset pin, and the design system). They are cited, not restated here.

## Decision

React Native + Expo is the mobile client
(`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:43`). The decision, already stated in `AGENTS.md`
(section "Product context"), is recorded here rather than restated:

- The mobile client is **React Native + Expo**, per `AGENTS.md` (section "Product context").
- **Its own conventions live in `apps/mobile/AGENTS.md`** — Expo's versioned-documentation rule, Expo
  Router navigation, EAS builds, the `@react-native/jest-preset` pin, the design system, and the
  lint/typecheck/test commands. This record **cites that file rather than restating its rules**.
- The mobile base URL gains the `/v1` prefix in this change
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:63`).

## Consequences

- The client's build, navigation, testing, and design-system conventions are owned by
  `apps/mobile/AGENTS.md` and the design-system spec (ADR-0022), not by this record.
- Server state is fetched through RTK Query (ADR-0021); forms use React Hook Form
  (`AGENTS.md`, section "Product context").
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **A native (non-Expo) or web client.** Rejected: the target architecture is React Native + Expo
  (`AGENTS.md`, section "Product context").
- **Restating the mobile conventions in this record.** Rejected: `apps/mobile/AGENTS.md` owns them, and
  the design cites it rather than duplicating it
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:43`).
