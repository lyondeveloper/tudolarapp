# Tasks

This change structures T01's decisions; it does not answer them. The product owner answers a **group
at a time** from the register in `design.md`, and each answer is recorded as an ADR.

## 1. The register

- [x] 1.1 Confirm the register in `design.md` is complete against the spike set: every open decision named in `docs/spikes/SP01`–`SP12` and the three `CROSS-*.md` documents appears exactly once, and no spike-local `U` number survives; verify by listing each report's open decisions and matching them to a register row.
- [x] 1.2 Replace the open-decisions list in `docs/spikes/SYNTHESIS.md` with a pointer to this register, so there is one list rather than two that can drift; verify the synthesis contains no decision that the register also states.

## 2. Recording the answers

Each task below becomes one ADR per decision, numbered from 0009, in the order the product owner
answers. An ADR records the decision, its rationale, and the alternatives rejected.

- [x] 2.1 Record the answers to **group A** (pair/rail enum members and labels, and whether fully-digital pairs need a meeting) as ADRs, and note any that remain unanswered rather than guessing.
- [x] 2.2 Record the answers to **group B** (margin expression and bounds, same-asset pairs, quote validity, rounding, min/max, offer expiry) as ADRs.
- [x] 2.3 Record the answers to **group C** (incident release, reservation during reconfirmation, unconfirmed-agreement expiry) as ADRs.
- [x] 2.4 Record the answer to **group D** (whether replenishment is allowed) as an ADR, and if it is, reference SP03's append-only ledger recommendation.
- [x] 2.5 Record the answers to **group E** (mandatory contact verification, reputation signals and KYC scope, blocking semantics, moderation and SLAs, global versus market-specific scope) as ADRs.
- [x] 2.6 Record the answers to **group F** (plans and prices, provider, expiry and grace, renewal and refunds, app-store billing) as ADRs.
- [x] 2.7 Record the answers to **group G** (sanctions screening, privacy and retention, jurisdictional review) as ADRs, marked as legal-review inputs rather than clearances.
- [x] 2.8 Record the answers to **group H** (LLM provider, PII rule, cost budget, auth requirement, logging) as ADRs.
- [x] 2.9 Record the answers to **group I** (pilot thresholds, supply minimums, deferral list, analytics SDK) as ADRs. Recorded as deferred in ADR-0027 on the product owner's instruction; no value invented.
- [x] 2.10 Record the answers to **group J** (margin as earnings and its label, out-of-node copy, GPS accuracy, location precision and retention, default radius) as ADRs.

## 3. Updating the record

- [x] 3.1 For each answered row, replace the register row in `design.md` with a pointer to its ADR; verify no answered decision still reads as open.
- [x] 3.2 Update the T01 entry in the Notion backlog with the answers and the ADR numbers, and mark the task Done once the register is empty.
- [x] 3.3 Confirm no application code, schema, migration, or dependency changed: `git diff --stat` shows only `docs/`, `openspec/`, and `AGENTS.md`.
- [x] 3.4 Run `openspec validate t01-product-decisions --strict` and confirm it passes with `specs` correctly skipped.

## Workflow follow-up

- T02 starts once this change is Done, and consumes the ADRs; it must not begin earlier.
- If a group cannot be answered, record the blocker in the register and leave the row open rather than
  inferring an answer.
