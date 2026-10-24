# Design

## Context

See proposal.md — Why. The evidence behind each open decision is in `docs/spikes/SP01`–`SP12`, the
three `docs/spikes/CROSS-*.md` cross-checks, and `docs/adr/0001`–`0008`.

The register below maps each answered group to its ADR. The ADR is the current decision; groups G and
I remain explicitly open and are not to be answered by an agent.

## Decisions already taken

Recorded here so they stop living in chat. Each already has an ADR or an authoritative note.

| Decision | Where it lives |
| --- | --- |
| **Zelle is out of the MVP** — five pairs remain: VES → USDT, VES bank → VES cash, VES → USD cash, USDT → VES, USDT → USD cash | T01 in Notion; `AGENTS.md`; `README.md` |
| **The market boundary is the official limit of Municipio Lagunillas**, sourced from **OpenStreetMap**, with the attribution "© OpenStreetMap contributors" required in the app | T01 in Notion; `SYNTHESIS.md` |
| **Daily earnings bucket on market-local time** (`America/Caracas`), computed server-side | `SYNTHESIS.md` |
| **Stored inventory counters**, with one-writer-same-transaction, CHECK constraints, and an asserted reconciliation | `SYNTHESIS.md` |
| **Decisions live as ADRs** under `docs/adr/` | `docs/adr/README.md` |
| **The seller sets every commercial value**; no platform reference rate, and the rate is a structured, normalized field search filters and orders by | **ADR-0008** |
| **Test convention**: E2E in its own folder, every testable unit with a test beside it | `AGENTS.md` |
| **E2E stays local-only** — the mobile suite joins no CI or launch gate | `SYNTHESIS.md` |
| **Terms versions belong to the offer**; SP04's status enum; the closed search-criteria schema; two-axis pairs with one closed id; the publish gate composed in the use case | **ADR-0001**–**0006** |

## The register, answered

The product owner authorized these calls on 2026-10-17, with the instruction that the MVP be built
step by step from them. Each becomes an ADR; any of them can be overruled, and overruling one means
editing its ADR rather than adding a second.

**MVP shape.** The MVP is the **both-sides loop**: a seller publishes an offer and a buyer finds it in
search, on the real mobile app, against the real API and database.

**Accounts are not separated by type.** Selling is a state, not an account kind; the product owner's
decision and its consequences are recorded in ADR-0016.

| Group | Record |
| --- | --- |
| **A — Pair and rail** | ADR-0009 |
| **B — Pricing and offer terms** | ADR-0008 and ADR-0010 |
| **C — Agreement rules** | ADR-0011 |
| **D — Inventory replenishment** | ADR-0012 |
| **E — Onboarding and trust** | ADR-0013 |
| **F — Subscriptions** | ADR-0014 |
| **G — Legal and compliance** | ADR-0013 and ADR-0014 record legal-review inputs, not clearances; the legal decisions remain open. |
| **H — Search parser** | ADR-0015 |
| **I — Pilot thresholds and analytics** | ADR-0027 records it as deferred, not decided; no value is invented. |
| **J — Earnings and location defaults** | ADR-0017 and ADR-0018 |

## The open register

**Superseded by the answers above.** The only rows still open are group **I** (pilot thresholds,
supply minimums, deferral list, analytics SDK) and group **G** (legal review), and neither blocks the
MVP build.

## Risks / Trade-offs

- [A register can become a second copy of the truth and drift] → once a decision is answered, the
  register row is replaced by a pointer to its ADR, and `SYNTHESIS.md`'s open list becomes a pointer
  here rather than a duplicate.
- [Answering decisions in isolation can produce an incoherent set] → the grouping is by *what each
  blocks*, so decisions that must agree sit in the same group; the product owner should answer a group
  at a time rather than one row at a time.
- [An agent might answer a row to make progress] → this change's tasks contain no implementation, and
  the register states owners explicitly. A row answered without the owner is a defect, not progress.

## Migration Plan

No code, schema, or dependency changes. Rollback is a revert of the commit.

## Open Questions

Two groups remain open, and neither blocks the MVP build: **I** (pilot thresholds, supply minimums,
the deferral list, and whether an analytics SDK is ever added) belongs to the pilot, and **G** (the
legal review) is an input from a lawyer rather than an engineering decision.
