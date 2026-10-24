# 0001 — Terms versions belong to the offer

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** SP04's agreement-scoped terms snapshot —
  `docs/spikes/SP04-agreement-cancellation-incidents.md:60` (immutable `agreement_terms_version`
  rows created when the agreement is proposed), recorded as conflict C1 in
  `docs/spikes/CROSS-A-transaction-lifecycle.md:93-105`.

## Context

Two reports require an immutable, referenced terms version — never an overwrite — but they disagree
on its parent:

- SP04 scopes it to the **agreement**: `agreement_terms_version` rows "with a monotonic `version`
  int" and a `snapshot` (`docs/spikes/SP04-agreement-cancellation-incidents.md:60`), created when
  the agreement is proposed ("freeze snapshot v1", `SP04:145`) and recreated as vN+1 on a change
  (`SP04:148`).
- SP09 scopes it to the **offer**: "the offer row points at the current version and every
  confirmation/agreement stores the version id it agreed to"
  (`docs/spikes/SP09-technical-feasibility-test-architecture.md:143-145`), with a unique
  `(offer_id, version)` and an offer→current-version FK (`SP09:152`).

They cannot both be the source of truth. `docs/spikes/CROSS-A-transaction-lifecycle.md:93-105`
records this as conflict C1, "the cluster's most important conflict", and reconciles it in favour of
the offer.

## Decision

The immutable terms version belongs to the **offer**, not the agreement. `offer_terms_versions` is
the source of truth, and an agreement references a version id.

The design states the reason from the backlog: T13 requires the agreement record to capture "the
same version of the offer's complete terms"
(`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:36-38`), and SP02 makes *material offer
changes* the versioned event — so the version belongs to the offer.

## Consequences

- SP04's `agreement_terms_version` is re-pointed to reference an offer version id. SP09's own
  alternative B already allows "a denormalized copy of the referenced version, not the source"
  (`docs/spikes/SP09-technical-feasibility-test-architecture.md:146-148`).
- Left open (product owner): the exact terms-snapshot field list —
  `docs/spikes/SP04-agreement-cancellation-incidents.md:62` says "the exact field list is SP02's,
  not this spike's", recorded as D14 in `docs/spikes/CROSS-A-transaction-lifecycle.md:240`. This ADR
  settles the parent, not the fields.
- Left open (not this change): reservation handling during reconfirmation (conflict C2,
  `docs/spikes/CROSS-A-transaction-lifecycle.md:106-114`) and whether immutability is enforced by a
  trigger or in the application (D27, `docs/spikes/CROSS-A-transaction-lifecycle.md:273-274`).

## Alternatives considered

**SP04's agreement-scoped snapshot, created when the agreement is proposed.** Rejected: two
agreements on one offer could then hold different snapshots of the same terms, and the offer's own
history would be unrecoverable — which is exactly the history a seller edit needs
(`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:39-41`).
