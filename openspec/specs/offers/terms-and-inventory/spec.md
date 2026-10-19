# offers/terms-and-inventory Specification

## Purpose

Defines valid offer terms and the data contract used to publish and inspect an offer without
changing the pair or misrepresenting its inventory denomination.

## Requirements

### Requirement: Published offers retain one pair and consistent amount assets
The system MUST treat an offer's `pairId` as immutable after publication. Every terms version MUST use the pair's give asset for give, minimum, and maximum amounts, and the pair's receive asset for the receive amount.

#### Scenario: A seller attempts to change the pair
- **WHEN** a seller submits a material edit with a different `pairId` for an existing offer
- **THEN** the edit is rejected and the current terms-version pointer remains unchanged

#### Scenario: A terms amount uses the wrong asset
- **WHEN** a terms edit supplies a give, receive, minimum, or maximum amount whose asset does not match the selected pair
- **THEN** the edit is rejected and no terms version is appended

### Requirement: Offer inventory remains in the give asset and within its initial amount
The system MUST denominate the initial, reserved, and completed inventory amounts in the pair's give asset. The initial amount MUST be positive, reserved and completed amounts MUST be nonnegative, and their sum MUST NOT exceed the initial amount.

#### Scenario: Inventory counters do not match the pair or exceed initial inventory
- **WHEN** an offer has a counter in another asset, a nonpositive initial amount, a negative counter, or reserved plus completed inventory greater than initial inventory
- **THEN** the offer is rejected and its inventory is not changed

### Requirement: Offer commercial terms satisfy defined bounds
The system MUST reject nonpositive give, receive, minimum, or maximum amounts; minimum amounts greater than maximum amounts; margins outside `0 <= margin < 100`; and rates that are absent for conversion pairs, present for `VES_BANK_TO_VES_CASH`, or nonpositive for conversion pairs.

#### Scenario: A seller supplies invalid amount bounds
- **WHEN** a material edit has a nonpositive amount or a minimum greater than its maximum
- **THEN** the edit is rejected before persistence

#### Scenario: A seller supplies a rate inconsistent with the pair
- **WHEN** a conversion pair has no positive rate, or `VES_BANK_TO_VES_CASH` has a rate
- **THEN** the edit is rejected and the current terms remain unchanged

### Requirement: Offer expiry is bounded
The system MUST default a new offer's expiry to seven days after publication when omitted, and MUST reject an expiry that is not in the future or is more than thirty days after the current publish or edit operation.

#### Scenario: A seller omits expiry
- **WHEN** an offer is published without an explicit expiry
- **THEN** its first terms version expires seven days after publication

#### Scenario: A seller supplies an expiry outside the allowed window
- **WHEN** an offer is published or edited with an expiry at or before the operation time, or more than thirty days after the operation time
- **THEN** the operation is rejected without changing the current terms

### Requirement: Offer publication carries all required terms and market context
The offers application command MUST carry seller and validated market context, pair, description/details, initial inventory amount, per-transaction give/receive amounts, rate, margin, give-asset limits, and optional expiry needed to construct the offer and its first terms version.

#### Scenario: A complete publish command carries all required values
- **WHEN** the application constructs a publish command from seller input and validated market context
- **THEN** it carries the initial inventory amount and all per-transaction terms needed to create the offer and first terms version

#### Scenario: The publish expiry is omitted
- **WHEN** a seller omits expiry from a publish request
- **THEN** the initial-terms expiry resolver returns a date seven days after the supplied operation time

### Requirement: New offers begin with a complete first terms version
The domain MUST create version one with the supplied pair and commercial values, the operation time as `createdAt`, and a resolved expiry.

#### Scenario: Initial terms preserve seller values and receive the default expiry
- **WHEN** the initial-terms builder receives a complete conversion-pair input without an explicit expiry
- **THEN** it returns version one with the supplied values and expiry seven days after the operation time

### Requirement: An offer representation exposes its current terms
An offer read representation MUST include the current terms-version identifier and the commercial terms needed to inspect the seller's offer, rather than exposing only an undisclosed pointer.

#### Scenario: A client reads a published offer
- **WHEN** a published offer is returned to a client
- **THEN** the representation includes its pair, amounts, rate, margin, limits, expiry, and current terms-version identifier

### Requirement: Persistent offer terms enforce their invariants
The database MUST reject terms rows with an unknown pair, invalid amount or margin bounds, invalid rate nullability for the pair, or a version less than one. Persisted terms versions MUST reject updates and deletes.

#### Scenario: Direct persistence violates a terms constraint
- **WHEN** a persistence adapter attempts to insert a row that violates a pair, amount, margin, rate, or version constraint
- **THEN** PostgreSQL rejects the insert

#### Scenario: A caller mutates an existing terms version
- **WHEN** a caller attempts to update or delete an existing terms version
- **THEN** PostgreSQL rejects the mutation and leaves the row unchanged

### Requirement: Terms migration preflight protects existing data
Before adding offer-terms constraints, the migration MUST detect existing rows that violate those constraints and abort with a diagnostic identifying a violating row without modifying or deleting existing data.

#### Scenario: Invalid existing terms prevent constraint installation
- **WHEN** the constraints migration encounters a pre-existing terms row that violates a new constraint
- **THEN** the migration fails with the row identifier, preserves the row, and leaves the new constraints unapplied

### Requirement: Agreement terms belong to the referenced offer
The system MUST reject resolution of an agreement's terms when the referenced terms version belongs to a different offer.

#### Scenario: Agreement and terms version name different offers
- **WHEN** an agreement reference's `offerId` differs from the resolved terms version's `offerId`
- **THEN** terms resolution fails with a controlled consistency error
