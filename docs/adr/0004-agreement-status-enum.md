# 0004 — Agreement status enum

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** SP11's invented status labels —
  `docs/spikes/SP11-seller-transaction-history-earnings.md:164-167` ("Mutually cancelled",
  "Disputed/incident") and `SP11:143`, recorded as mismatch M1 in
  `docs/spikes/CROSS-A-transaction-lifecycle.md:125-133`.

## Context

SP04's proposed agreement state machine has a specific status set:

| State | Meaning |
| --- | --- |
| `awaiting_confirmation` | A frozen terms version exists; at least one party has not confirmed it. |
| `confirmed_by_both` | Both parties confirmed the **same** version. |
| `completed` | Both parties reported the exchange happened. |
| `cancelled` | Both parties agreed to cancel (mutual). |
| `incident_open` | An incident is recorded and unresolved. |
| `expired` *(optional)* | An unconfirmed agreement passed its window. |

— `docs/spikes/SP04-agreement-cancellation-incidents.md:103-110`

SP11 assumed different labels and admits it: "this report uses the labels the backlog already states
— `confirmed_by_both`, completed, mutually cancelled, incident — and treats any additional states as
SP04's to name" (`docs/spikes/SP11-seller-transaction-history-earnings.md:75-77`). Its status set is
"completed … Mutually cancelled … Disputed/incident" (`SP11:164-167`) and "cancelled" (`SP11:143`).

So SP11 says **"mutually cancelled"** where SP04 names the state `cancelled`; SP11 says
**"disputed"** where SP04 names it `incident_open`; and SP11 never mentions
`awaiting_confirmation` or `expired` at all. `docs/spikes/CROSS-A-transaction-lifecycle.md:125-133`
records this as mismatch M1.

## Decision

SP04's agreement status enum is authoritative, and SP11 adopts it
(`openspec/changes/spike-interface-reconciliation/design.md:56-59`). The design names the concrete
corrections: the real enum is `cancelled` and `incident_open`, alongside `awaiting_confirmation` and
`expired`, which SP11 never mentioned.

F01 renders from SP11's approved status, so the labels must match before either is built —
`docs/spikes/CROSS-A-transaction-lifecycle.md:125-133` records F01 as rendering "'SP11's approved
status' from 'immutable transaction records'" (`/tmp/backlog2.md:248`).

## Consequences

- SP11's report is corrected additively to SP04's labels; its original text stays visible with a
  pointer to this ADR.
- The source of truth for the full status set is SP04's proposed state table
  (`docs/spikes/SP04-agreement-cancellation-incidents.md:103-110`), which also carries
  `confirmed_by_both` and `completed`; the design names the four values SP11 got wrong or omitted.
- Left open (product owner / SP04): the exact final enum and how a disputed/incident state is
  represented (D25, `docs/spikes/CROSS-A-transaction-lifecycle.md:269-270`), and the incident's own
  type/moderation lifecycle (`docs/spikes/SP04-agreement-cancellation-incidents.md:72`).

## Alternatives considered

**SP11's labels ("mutually cancelled", "disputed").** Rejected because SP04 owns the state machine
and its enum is the actual one; F01 renders from SP11's approved status, so a label that does not
match SP04's enum would put the two modules out of sync before either is built
(`docs/spikes/CROSS-A-transaction-lifecycle.md:125-133`).
