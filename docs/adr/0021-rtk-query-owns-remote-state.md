# 0021 — RTK Query owns remote state

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0021** in the stack table
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:32-44`)

## Context

`AGENTS.md` (section "React") already states the decision as rules: fetch server state through RTK
Query only, with one `createApi` slice per base URL; do not add a second server-state cache beside it;
and use Redux Toolkit for app-wide client state, keeping server data out of hand-written slices. This
record records that decision and its rationale and cites `AGENTS.md` rather than restating it as a new
rule (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:34`).

The rationale is the no-duplicated-state rule in the same section: two caches holding the same
resource contradict it.

## Decision

RTK Query is the **sole remote-state layer** and Redux Toolkit owns **client state only**
(`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:40`). The decision, already a rule in `AGENTS.md`
(section "React"), is recorded here rather than restated:

- **One `createApi` slice per base URL**; all server reads and writes go through it.
- **Redux Toolkit is for app-wide client state**; server data stays out of hand-written slices.
- **No second server-state cache** — no TanStack Query (or equivalent) beside RTK Query.

## Consequences

- The mobile client has exactly one server-state cache, so a resource cannot be duplicated across two
  caches.
- The API base URL gains the `/v1` version prefix in this change; the RTK Query base URL changes with
  it (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:63`).
- RTK Query's `setupListeners` is wired with NetInfo for reconnect refetching on device
  (`AGENTS.md`, section "React Native (Expo mobile client)").
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **Adding TanStack Query beside RTK Query.** Rejected: a second server-state cache holding the same
  resource is the duplicated state `AGENTS.md` (section "React") forbids.
- **Hand-written thunks and slices holding server data.** Rejected: Redux Toolkit owns client state
  only; RTK Query owns the server cache.
- **Fetching server state directly from components.** Rejected: reads and writes go through the RTK
  Query layer.
