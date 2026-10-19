# 0025 — API module boundaries

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0025** in the stack table
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:32-44`)

## Context

Several modules (T08 subscriptions, T09 offers, T13 exchanges) must be able to proceed **in parallel**,
which is only possible if the contracts between them are frozen and each contract has exactly one
owning module (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:9-11`). The module-boundaries table
records that ownership (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:109-125`), and the publish
gate is composed in the offers use case from two ports per **ADR-0006**.

## Decision

The API module boundaries and the contract each module owns are recorded from
`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:109-125`:

| Module | Owns | Consumes |
| --- | --- | --- |
| `catalog` | assets, rails, pairs, money | nothing — pure domain |
| `common` | error envelope, pagination, versioning, market-context guard | `catalog` |
| `markets` | the market, its polygon, and the market predicate | `catalog`, `common` |
| `sellers` | `SellerEligibility` (a **state**, never an account type — ADR-0016) | `common` |
| `subscriptions` | the entitlement **port** only (ADR-0014) | `common` |
| `offers` | offers, terms versions, quotes, inventory counters | `catalog`, `markets`, `sellers`, `subscriptions` |
| `search` | `SearchCriteria` and the query | `catalog`, `markets`, `offers` |
| `conversations` | conversations and messages | `offers` |
| `exchanges` | agreements, incidents, the state machine | `offers`, `conversations` |
| `reports` | reports, blocks, moderation | `sellers` |

- **`catalog` alone may declare a pair, asset, rail, or money type.** It owns them and is the only
  module that may declare them, so parallel modules cannot collide on shared value objects
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:147-148`).
- **The publish gate is composed in the offers use case from two ports** — seller eligibility and
  entitlement — per **ADR-0006**, so neither `sellers` nor `subscriptions` needs to know the other
  exists (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:124-125`).

## Consequences

- Each contract has exactly one owner, so the parallel modules (T08–T14) can proceed without colliding
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:9-11`).
- No module declares its own pair, asset, rail, or money type; they import the shared `catalog`
  contracts (`openspec/changes/archive/2026-10-17-t02-technical-contracts/tasks.md:51`).
- The publish gate's composition point is the offers use case, consistent with ADR-0006.
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **Letting each module declare its own pair, asset, rail, or money type.** Rejected: it is the
  shared-value-object collision the single-owner rule prevents
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:147-148`).
- **Composing the publish gate inside `sellers` or `subscriptions`.** Rejected by ADR-0006: both
  inputs are ports and neither module knows about the other.
- **A module owning another module's contract.** Rejected: the table gives each contract exactly one
  owner so parallel work does not collide
  (`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:109-125`).
