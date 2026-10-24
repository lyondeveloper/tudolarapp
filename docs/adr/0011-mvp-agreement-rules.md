# 0011 — MVP agreement rules

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group C register rows — whether a single-party incident report releases the
  reservation, whether the reservation is held during reconfirmation, and whether an unconfirmed
  agreement expires (`docs/spikes/SYNTHESIS.md:118-121`)

## Context

`docs/spikes/SYNTHESIS.md:118-121` listed three agreement questions as technical, for T02 rather than
the product owner: whether an unconfirmed agreement expires, whether a reservation is held or released
during reconfirmation, and whether a single-party incident report releases the reservation. It noted
the backlog fixes mutual cancellation but is silent on withdrawal alone. SP04 supplies the state
machine these rules attach to (`docs/spikes/SYNTHESIS.md:14`), and ADR-0004 fixed its enum, including
the optional `expired` state (`docs/adr/0004-agreement-status-enum.md:12-23`).

The product owner answered on 2026-10-17 (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

The reservation is protected against unilateral release, and an unconfirmed agreement does not hold
inventory forever (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:67-73`).

- **C1 — A single-party incident report does not release the reservation.** Release happens only on
  mutual cancellation or a moderation decision — the anti-abuse choice, since the alternative hands one
  party a unilateral way to free inventory.
- **C2 — During reconfirmation the reservation is held.**
- **C3 — An unconfirmed agreement expires after 24 hours**, releasing any hold.

## Consequences

- C1 keeps SP04's "no single-party cancel after confirmation" intact and extends it to the incident
  path: an incident does not free inventory, only mutual cancellation or moderation does
  (`docs/spikes/SYNTHESIS.md:14`).
- C3 gives ADR-0004's optional `expired` state a concrete 24-hour window for unconfirmed agreements
  (`docs/adr/0004-agreement-status-enum.md:21`).
- C2 means inventory cannot escape during the reconfirmation step; the hold persists across it.
- Left open (unchanged): group **G** (the legal review, including retention of report evidence) and
  group **I** (pilot) remain open (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Letting a single-party incident report release the reservation.** Rejected: it hands one party a
  unilateral way to free inventory, which is the anti-abuse problem C1 exists to close
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:69-71`).
- **Releasing the reservation during reconfirmation.** Rejected: the reservation is held through
  reconfirmation (C2), so inventory cannot escape mid-agreement
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:72`).
- **Letting an unconfirmed agreement hold inventory indefinitely.** Rejected: it expires after 24
  hours, releasing any hold (C3)
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:73`).
