# Proposal

## Why

Four independent audits ran after T02 froze the technical contracts. Each was told to judge the
design against its own decisions and to say when a decision looks wrong. Four findings are **contract
gaps, not code defects** — and all four sit directly in the path of the next task:

- **The inventory reservation has no owner, port, or column anywhere.** `apps/api/src/` contains no
  reservation code and the frozen contracts never name one. The reservation is the product's central
  atomic invariant — the thing that prevents overselling a seller's declared inventory — and T03 is
  the task that builds the data foundation. Without this, **T03 must invent the invariant rather than
  implement it**, which is exactly what the backlog forbids.
- **`offer_terms_versions` is absent from `schema.prisma`.** It exists only as raw SQL in a migration,
  so Prisma does not own a core business table. That contradicts **ADR-0019** (Prisma as the sole
  schema and migration authority) and means a future `migrate dev` can propose dropping it. T03 owns
  the data foundation and must reconcile this drift, or it inherits it.
- **ADR-0003 and ADR-0005 contradict each other.** ADR-0005 says the search criteria expose "a single
  **closed pair id**"; ADR-0003 defines the criteria as `direction{give,receive}` — a two-leg shape
  that is not closed over valid pairs. Two records disagree about the same contract, so whichever an
  implementer reads first wins. That is the failure mode the spike cross-checks existed to prevent.
- **The rate has no defined denominator.** ADR-0008 made the rate a structured, normalized field that
  search **filters and orders by**, and delegated the normalization convention to T02. T02 dropped it.
  So the field exists without the one property that made it filterable — and because the platform
  publishes no reference rate, there is no other anchor.

Each is cheap to fix now and expensive to fix after T03, T04, and T09 are built on top of them.

## What Changes

- **Give the reservation an owner and a contract.** Name the module that owns it, the port the offer
  and agreement flows call, and the columns the counters live in — consistent with the stored-counter
  decision already taken (one writer, same transaction; CHECK constraints; an asserted
  reconciliation). The aggregate stays in the offers module; this change decides the boundary, not the
  implementation.
- **Put `offer_terms_versions` in `schema.prisma`** so Prisma owns it, and reconcile the migration so
  there is one authority rather than a modelled table and a hand-written one that can drift.
- **Resolve ADR-0003 against ADR-0005** and record which shape wins, so the criteria and the catalog
  agree. One of the two records is amended; the pair/rail axes stay internal per ADR-0005.
- **Define the rate normalization convention** — the denominator, the unit, and the direction — so the
  field ADR-0008 made filterable actually is. ADR-0008 is amended to point at it rather than leaving it
  to a task that dropped it.
- **Record each resolution as an ADR**, amending the ones that were wrong rather than adding
  contradictory records on top.

## Capabilities

### New Capabilities

None. This change corrects contracts and records decisions, so it declares `skip_specs: true`. The
corrected contracts are the specs the consuming tasks write.

### Modified Capabilities

None.

## Impact

- `docs/adr/` — amendments to 0003, 0005, 0008, 0019, plus whatever the reservation and rate
  resolutions need.
- `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/` — the terms-version table becomes
  modelled, and the reservation's columns are declared with it.
- `apps/api/src/` — the reservation port and the rate normalization live where the module table says
  they belong; the offers module owns the reservation.
- No behavior change, no new dependency, and no framework decision reopened.

### Out of scope

- **Implementing the reservation.** This change fixes the contract; T09 implements it. Deciding the
  boundary and writing the logic are different jobs, and conflating them is how the original gap
  happened.
- **The remaining audit findings** — the pagination keyset seek (T10, when the offers table exists),
  the missing unit tests for `session.service.ts` and the auth adapters, the duplicated identity
  normalization, and the DI-token inconsistency. Each is recorded in `docs/audits/` and wants its own
  change; none blocks T03.
- **Groups I and G** — the pilot thresholds and the legal review — stay open.
- **Reopening the agreed stack.**

### Source

Notion T02 — Approve Technical Decisions and API Contracts — https://app.notion.com/p/d358155c-3492-4735-81e0-c058e08e3b36

Raised by `docs/audits/system-design.md` and `docs/audits/algorithms-optimisation.md`, and verified
directly against the code before being recorded here.
