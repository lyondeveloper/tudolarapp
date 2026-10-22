# Design

## Context

See `proposal.md` for motivation and scope. The contracts to reconcile are in
`docs/adr/0001`–`0025`; the audit evidence is in `docs/audits/system-design.md` and
`docs/audits/algorithms-optimisation.md`. The existing API layer boundaries are documented in
`docs/adr/0020` and `docs/adr/0025`.

The four gaps this change closes are: ownership of offer inventory reservations, Prisma's missing
model for the existing `offer_terms_versions` table, the external search-pair shape, and the
normalization of the seller-entered rate. This is a contract correction, not a reservation or search
feature implementation.

## Goals / Non-Goals

**Goals:**

- Give the offers module one explicit inventory aggregate and reservation port that T03, T09, and
  T13 can implement and consume without inventing separate ownership.
- Make the existing terms-version table part of Prisma's declared data model without rewriting an
  already-recorded migration or losing its database immutability triggers.
- Make the closed `PairId` the single external search representation.
- Define the unit and direction of the seller-entered rate without introducing a platform rate or
  monetary calculation.

**Non-Goals:**

- Implementing inventory writes, offer persistence, search execution, or any HTTP endpoint.
- Creating the offers table before T03.
- Changing the product decisions in ADR-0009–0018 or adding a spec delta.

## Decisions

### Offers owns inventory and its reservation port

The offers module owns the `Offer` aggregate, its inventory counters, and the application port for
changing them. Its domain contract includes the offer identity and market/seller scope, status,
description/details, current terms-version pointer, and `initialAmount`, `reservedAmount`, and
`completedAmount`. These amounts are exact `Money` values in the offer's give-asset unit.
`availableAmount` is derived as `initialAmount - reservedAmount - completedAmount`; it is not a
stored column.

The offers application layer declares the reservation port. Exchanges consumes that port when
agreement transitions require inventory changes; exchanges does not own or duplicate the counters.
The port contract covers reserving inventory, releasing a reservation, and moving a reservation to
completed inventory. Reservation uses an atomic compare-and-swap guard and returns whether the
requested amount was reserved. Release and completion are also guarded against underflow. The
agreement status transition and its corresponding counter change commit or roll back in the same
database transaction.

Per ADR-0011, the reservation is made at the second confirmation. A single-party incident does not
release it; mutual cancellation, moderation release, and expiry do. Completion moves the reserved
amount to completed inventory. Database CHECK constraints enforce non-negative counters and
`reservedAmount + completedAmount <= initialAmount`; an integration reconciliation checks stored
counters against agreement states. T03 adds these columns and constraints when it creates the offers
table.

**Alternative:** Put the reservation lifecycle in exchanges and expose offers counters as a
projection. Rejected because the offers module owns the inventory being guarded, while the existing
module graph already makes exchanges a consumer of offers.

### Prisma models the existing terms-version table

Add an `OfferTermsVersion` Prisma model mapped to the existing `offer_terms_versions` table, with
fields and database types matching the already-recorded migration, including its unique
`(offer_id, version)` index. Keep the existing `offerId` as a UUID scalar until T03 introduces the
`Offer` model and table; T03 then adds the Prisma relation and foreign key.

Do not edit or replace the existing migration: it is already in the migration history and owns the
table DDL. The model makes Prisma aware of that DDL, while the hand-written update/delete triggers
remain in the existing `--create-only` migration because Prisma cannot represent them. Verify the
mapping against the migration history and verify the triggers remain installed.

**Alternative:** Add a second create-table migration or rewrite the recorded migration. Rejected
because it duplicates schema authority and can break databases where the original migration has
already run.

### Search criteria expose one closed pair id

The external and application `SearchCriteria` contract carries `pairId: PairId | null`, not two
independent `Leg` values in `direction`. The catalog's closed pair allowlist remains the authority;
the legs remain internal to catalog resolution. This prevents a criteria object from expressing a
combination that is not in the MVP catalog. ADR-0003 is amended to agree with ADR-0005, and the
search example uses a valid catalog pair.

**Alternative:** Keep both legs and add a second pair-resolution step. Rejected because the API and
parser would still expose a shape that admits invalid pairs and duplicates catalog validation at
the boundary.

### Rate is receive units per one give unit

For a directional `PairId`, `rate` means the number of receive-asset units for one unit of the
give asset. It is a seller-entered exact decimal with the existing maximum scale of eight fractional
digits; it is not derived from quote amounts or a platform reference. Rate filters and ordering
compare values only within the same `PairId`. The same-asset `VES_BANK_TO_VES_CASH` pair continues to
have no rate. Quote amount rounding remains governed separately by ADR-0010 B4.

`marginPct` remains a separate seller-declared field and is not used to calculate or adjust the
rate. The client and API do not describe it as a platform-calculated comparison or endorsement.
ADR-0008 records these semantics and points to this normalization.

**Alternative:** Store an unlabelled scalar or derive it from a platform reference. Rejected because
an unlabelled scalar is not comparable, and the product owner explicitly decided that the platform
publishes and computes no reference rate.

## Risks / Trade-offs

- [A model can drift from existing SQL] → map every Prisma field/index to the recorded migration,
  run Prisma's migration diff/status checks, and test access through the generated delegate.
- [A contract could be mistaken for implemented behavior] → keep the reservation and search
  execution explicitly in T09/T10/T13; this change only freezes their interfaces and invariants.
- [Rates from different directions have different units] → persist and compare them only within the
  same `PairId`; do not claim that a sorted rate is a fair or best rate.
- [Stored counters can disagree with agreement rows] → one transaction and one writer, database
  CHECK constraints in T03, plus an integration reconciliation.

## Migration Plan

The Prisma model maps the existing table and its already-recorded create migration; this change
does not create a duplicate table migration. The immutability triggers remain in that migration.
`offerId` remains a scalar UUID until T03 creates `Offer`, at which point the relation and foreign
key are added through the normal Prisma migration workflow. T03 also creates the inventory columns
and CHECK constraints from the contract above.

No running application data is transformed by this change. Rollback is a code/schema-model revert
before dependent migrations use the model; do not remove or rewrite the existing terms-version
migration after it has been applied.

## Open Questions

None for the four contracts in this change. The pilot and legal-review decisions remain open as
recorded in ADR-0009–0018 and are not prerequisites for these technical contracts.
