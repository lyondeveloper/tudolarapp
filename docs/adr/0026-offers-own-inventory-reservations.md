# 0026 — Offers own inventory reservations

- **Status:** Accepted
- **Date:** 2026-10-18
- **Resolves:** the missing inventory owner, reservation port, and counter contract identified in
  `docs/audits/system-design.md:44-87` (S1–S2).

## Context

The API's `Offer` contract only points to its current terms version, and the offers application ports
have no inventory operations. Yet ADR-0011 requires inventory to be reserved at the second
confirmation and released only for the specified agreement outcomes. The reservation protects the
offer's finite inventory from overselling; it is not an exchange-owned projection.

The product decision is to store `initial_amount`, `reserved_amount`, and `completed_amount`, derive
availability, use one writer in the same transaction, enforce bounds in PostgreSQL, and reconcile
the counters against agreement states (`docs/spikes/SYNTHESIS.md:154-171`).

## Decision

The offers module owns the `Offer` aggregate and its inventory lifecycle. Its contract includes
`id`, `marketId`, `sellerId`, `status`, `description`, `details`, the current terms-version pointer,
and exact `Money` values for `initialAmount`, `reservedAmount`, and `completedAmount`. The inventory
amounts use the offer's give-asset unit. `initialAmount` is immutable, and
`availableAmount = initialAmount - reservedAmount - completedAmount` is derived rather than stored.

The offers application layer owns the reservation port. The exchanges application consumes that
port when an agreement transition changes inventory; it does not define a second reservation owner.
The port exposes these operations:

- **Reserve:** atomically increase `reservedAmount` only when the offer is active and sufficient
  availability remains. The operation uses a compare-and-swap guard and reports whether it won.
- **Release:** decrease `reservedAmount` for mutual cancellation, moderation release, or expiry.
  A single-party incident does not release inventory.
- **Complete:** move the completed agreement's amount from `reservedAmount` to `completedAmount`.

The agreement state transition and its corresponding inventory operation MUST commit or roll back
together in one database transaction. Release and completion MUST NOT underflow the reservation.

The offers table enforces `initial_amount > 0`, `reserved_amount >= 0`,
`completed_amount >= 0`, and `reserved_amount + completed_amount <= initial_amount` with database
CHECK constraints. An integration reconciliation verifies that stored counters agree with
agreements in reserved and completed states. T03 creates the table, columns, and constraints; T09
and T13 implement the offers and agreement flows against this contract.

## Consequences

- Offers is the single owner of inventory counters and their invariants; exchanges consumes the
  offers-owned port.
- A failed compare-and-swap cannot oversell the offer; the losing confirmation must not persist an
  agreement transition that assumes the reservation succeeded.
- Stored counters can be checked both locally by constraints and against agreement state by the
  integration reconciliation.
- This ADR freezes the contract only. It does not add reservation behavior or an offers table.

## Alternatives considered

- **Let exchanges own the reservation and offers expose counters as a projection.** Rejected because
  it splits ownership of the inventory being protected from the aggregate that stores it.
- **Recompute availability by scanning agreements for every reservation.** Rejected because the
  agreed stored-counter design makes the guarded write atomic and avoids turning the critical
  reservation into a read-then-write operation.
- **Allow a single-party incident report to release inventory.** Rejected by ADR-0011 C1 because it
  would give one party a unilateral way to free the reservation.
