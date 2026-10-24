# Proposal

## Why

The twelve discovery spikes ran **in parallel and never read each other**. SP10 says so outright,
SP09 believed no sibling reports existed, and SP06 caught a sibling agent citing an SP12 report that
had not been written yet. Independent agreement between them is therefore meaningful — and so is
independent *disagreement*, which nobody was checking.

Three cross-checks over the clusters found concrete inconsistencies that no individual report could
see. They are not cosmetic: each one means two agents would build two different things from the same
evidence, and T02 would be writing contracts on top of contradictory interfaces.

- **A — transaction lifecycle:** the immutable terms version has **two incompatible parents**. SP04
  scopes it to the agreement, SP09 to the offer. SP11 also invented status labels ("mutually
  cancelled", "disputed") that do not match SP04's actual enum (`cancelled`, `incident_open`, plus
  `awaiting_confirmation` and `expired`).
- **B — discovery:** **a direct contradiction.** SP06 makes a location *required* when GPS is
  unavailable, while SP05, SP12 and the backlog all say search the whole active node — and SP06
  contradicts its own test case. SP12's parser also still emits SP06's *old* field names.
- **C — commercial and trust:** SP01 gives each direction a seller-set rate while SP02 keeps a
  platform reference rate with only a margin on top — a product call about whether a platform
  reference exists at all. The pair/rail enum has **four incompatible shapes** across SP01, SP02,
  SP06 and SP12. And nobody owns composing SP08's publishing entitlement with SP07's seller
  eligibility into the gate T09 enforces.

## What Changes

- **Reconcile the five findings above** into one coherent set of interfaces, resolving each conflict
  explicitly rather than leaving two plausible answers in the repository.
- **Produce the contract shapes** the spikes imply but never agreed on: the pair/rail representation,
  the closed search-criteria schema, the terms-version parent, the agreement status enum, and the
  publish-authorization composition.
- **Record each resolution as an ADR** under `docs/adr/`, which is where the product owner has
  decided decisions live, so an implementer reads one current contract instead of twelve reports.
- **Correct the spike reports in place** where they are contradicted, marking each correction with a
  pointer to the ADR, so the evidence stays honest rather than being silently rewritten.

This is the **T02-shaped contract work that does not depend on T01's product decisions**. It
reconciles *shapes and names* — which the product owner's answers do not change — and it leaves every
value, threshold, and boundary open. It is deliberately out of sequence, like `mobile-design-system`
was, because T02 cannot write coherent contracts on top of contradictory interfaces.

## Capabilities

### New Capabilities

None. This change produces decisions and contracts, not behavior, so it declares `skip_specs: true`
rather than inventing a requirement. The contracts it settles become the specs T02 writes when T01
lands.

### Modified Capabilities

None.

## Impact

- `docs/adr/` (new) — one ADR per resolution.
- `docs/spikes/SP01`, `SP02`, `SP04`, `SP06`, `SP09`, `SP11`, `SP12` — corrected where contradicted,
  each with a pointer to the ADR that supersedes it.
- `docs/spikes/SYNTHESIS.md` — the reconciliation index.
- `AGENTS.md` — only if a resolution changes an engineering rule; not expected.
- No application code, no schema, no migration, and no dependency.

### Out of scope

- **Every T01 product decision**, including the Ciudad Ojeda polygon, the commercial values, the
  plans, the limits, and the legal review. Those stay open and are not guessed here.
- **Writing T02's full contract set.** The DTOs, versioning scheme, pagination, and error shapes wait
  for T01, because several of them depend on its answers.
- **Implementing anything.** No offers, search, agreements, or subscriptions are built here.
- **Reopening the agreed stack** — Prisma Migrate as the sole migration authority, hexagonal NestJS,
  RTK Query as the sole remote-state layer, gluestack as the design system, Maestro for mobile E2E.

### Source

Notion T02 — Approve Technical Decisions and API Contracts — https://app.notion.com/p/d358155c-3492-4735-81e0-c058e08e3b36

Requested by the product owner after the SP01–SP12 cross-check review, which is recorded in
`docs/spikes/CROSS-A-transaction-lifecycle.md`, `CROSS-B-discovery.md`, and
`CROSS-C-commercial-trust.md`.
