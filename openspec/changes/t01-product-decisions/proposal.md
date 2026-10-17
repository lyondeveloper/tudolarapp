# Proposal

## Why

T01 is the bottleneck. Twelve discovery spikes are complete, three cross-checks reconciled them, and
eight ADRs record the shapes — but **every remaining task blocks on T01's product decisions**:

| Task | Waits for |
| --- | --- |
| T02 (technical decisions and contracts) | T01 |
| T03 (Prisma and the data foundation) ‖ T15 (mobile Stitch shell) | T02 |
| T04 (markets and PostGIS), T05, T06, T07 … | T03 and T01's boundary |

Nothing else in the backlog can start. Meanwhile the open decisions are scattered across twelve spike
reports and three cross-check documents, each numbering its own `U1…Un`, so the set is not answerable
as it stands.

This change exists to make T01 answerable: **one register, every open decision, de-duplicated, with
what each one blocks and who owns it.** It records the decisions already taken, and it structures the
ones still open so they can be answered in one pass rather than by re-reading fourteen documents.

## What Changes

- **Records the decisions already taken** since the spikes, so they stop living in chat and commit
  messages: Zelle removed from the MVP; the market boundary is the official limit of Municipio
  Lagunillas sourced from OpenStreetMap with an attribution obligation; daily earnings bucket on
  market-local time; stored inventory counters; decisions live as ADRs; the test convention; E2E
  local-only; and the seller sets every commercial value with no platform reference rate.
- **Consolidates every remaining open decision** into one register, grouped by what it blocks, with
  the owner named. No spike-local `U` numbering survives.
- **States what each decision unblocks**, so the cost of leaving one unanswered is visible rather than
  implicit.
- **Produces one ADR per decision once answered**, because that is where the product owner has decided
  decisions live.

## Capabilities

### New Capabilities

None. This change records decisions rather than behavior, so it declares `skip_specs: true`. The
decisions become the specs T02 and the implementation tasks write.

### Modified Capabilities

None.

## Impact

- `openspec/changes/t01-product-decisions/design.md` — the decision register.
- `docs/adr/` — one ADR per answered decision, numbered from 0009.
- `docs/spikes/SYNTHESIS.md` — the open-decisions list becomes a pointer to the register rather than a
  second copy that can drift.
- No application code, no schema, no migration, and no dependency.

### Out of scope

- **Answering the decisions.** This change structures them; the product owner decides them. An agent
  that invents a threshold, a price, or a policy has failed this task.
- **T02's contracts.** They follow once T01 lands.
- **Implementing anything.**

### Source

Notion T01 — Finalize Product Decisions and MVP Scope — https://app.notion.com/p/d358155c-3492-4735-81e0-c058e08e3b36
