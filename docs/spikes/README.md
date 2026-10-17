# Discovery spikes (SP01–SP12)

Research-only investigations that run **in parallel** before T01. They are independent tracks: one
owner per spike, and none blocks another. T01 waits for the complete set, and the product owner
reviews it before approving T01.

This file is the shared protocol every spike follows. Each spike writes exactly one report here.

## The protocol

### Read first, before writing anything

1. `AGENTS.md` at the repository root — the authoritative engineering rules.
2. The backlog snapshot at `/tmp/backlog2.md` — find the section beginning `### SPnn — ` and treat it,
   **including its acceptance criteria**, as the task.
3. The project documents the spike touches: `README.md`, `docs/architecture.md`,
   `docs/flows/*.md`, `docs/testing/e2e.md`, and `openspec/specs/**` (the specs describe what exists
   today; `openspec/changes/archive/**` holds the history).

### Deliverable

One new file: `docs/spikes/SPnn-<slug>.md`, with these sections in this order:

1. **Task and acceptance criteria** — quoted from the backlog.
2. **Evidence and sources** — file paths with line references, and URLs. Separate what you
   **observed** from what you **assumed**.
3. **Options considered** — each with pros, cons, and why it was kept or rejected.
4. **Recommendation**.
5. **Unresolved decisions** — each marked with who owns it.
6. **Product and technical impact**.
7. **Testable scenarios** — concrete WHEN/THEN scenarios, suitable for future end-to-end coverage.
8. **Sources reviewed** — the `AGENTS.md`, documents, and files actually read.

Aim for 150–300 lines. Depth over breadth.

### Hard rules

- **Research only.** Do not implement features, do not change application code, do not run git
  commands, and do not modify any file other than your own single deliverable.
- **Never invent product rules, monetary rules, market boundaries, exchange rates, or business
  invariants.** Where a spike needs such a decision, present the options and mark it unresolved for
  the product owner. The backlog is explicit that no agent may invent these.
- **Ground every claim** in something you read, and cite it. If you cannot verify a claim, say so
  explicitly instead of asserting it.
- Respect the agreed stack: Prisma Migrate as the sole migration authority, hexagonal NestJS,
  PostgreSQL/PostGIS, RTK Query as the sole remote-state layer, gluestack as the design system.
  Do not reopen these decisions or add frameworks.

### Final message

Report the file path, then a five-line summary: the recommendation, and the open decisions you
surfaced. If the write tool is not permitted, do not retry it — return the complete document in your
final message instead and say it could not be written.

## The spikes

| Spike | Title | Report |
| --- | --- | --- |
| SP01 | Normalize MVP exchange pairs and payment rails | `SP01-exchange-pairs.md` |
| SP02 | Define pricing, quotes, limits, and offer terms | `SP02-pricing-quotes-limits.md` |
| SP03 | Specify offer inventory, multi-buyer allocation, and replenishment | `SP03-offer-inventory-allocation.md` |
| SP04 | Finalize the agreement, cancellation, and incident state machine | `SP04-agreement-cancellation-incidents.md` |
| SP05 | Specify market geofences, phone GPS, and location privacy | `SP05-market-geofences-location-privacy.md` |
| SP06 | Design the prompt-to-search contract and UX | `SP06-prompt-to-search-contract.md` |
| SP07 | Define seller eligibility, trust, safety, and support operations | `SP07-seller-eligibility-trust-safety.md` |
| SP08 | Validate subscription, compliance, and launch operations | `SP08-subscription-compliance-launch.md` |
| SP09 | Validate technical feasibility and test architecture | `SP09-technical-feasibility-test-architecture.md` |
| SP10 | Define MVP scope, pilot metrics, and release gates | `SP10-mvp-scope-pilot-metrics.md` |
| SP11 | Define seller transaction history and daily earnings | `SP11-seller-transaction-history-earnings.md` |
| SP12 | Evaluate the LLM for natural-language search | `SP12-llm-natural-language-search.md` |

## Where these reports go next

The product owner reviews the set. Accepted decisions are folded into the T01 and T02 OpenSpec
changes, which are where durable decisions live; a spike report is evidence for that review, not a
requirement the system must satisfy. Nothing here is implemented by the spikes themselves.
