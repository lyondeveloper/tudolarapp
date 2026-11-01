# offers/offers-publishing Specification

## Purpose
Enables eligible and entitled sellers to publish cash and currency exchange offers in Ciudad Ojeda with validated geographic boundary containment, inventory counters, and atomic initial terms versioning.

## Requirements

### Requirement: Sellers must be eligible and entitled to publish an offer
The system MUST verify that the authenticated user possesses an `eligible` seller state and an active subscription entitlement before accepting an offer publication request. If the seller is in any other state or lacks entitlement, the request MUST be rejected.

#### Scenario: Ineligible seller attempts to publish
- **WHEN** an authenticated user whose seller eligibility state is not `eligible` submits an offer publication request
- **THEN** the system rejects the publication request with an eligibility error and creates no offer

#### Scenario: Non-entitled seller attempts to publish
- **WHEN** an eligible seller without an active subscription entitlement attempts to publish an offer
- **THEN** the system rejects the publication request with an entitlement error and creates no offer

#### Scenario: Eligible and entitled seller publishes successfully
- **WHEN** an eligible seller with an active subscription entitlement submits a valid offer publication request
- **THEN** the publication request passes the gate and proceeds to persistence

### Requirement: Published offers require validated market containment
The system MUST require a valid market scope in the request header and verify that the specified physical meeting point coordinates fall within the geographic polygon boundary of that market.

#### Scenario: Meeting coordinates fall outside the market boundary
- **WHEN** a seller submits meeting coordinates located outside the active boundary of Ciudad Ojeda
- **THEN** the system rejects the request with an out-of-boundary error

#### Scenario: Meeting coordinates fall inside Ciudad Ojeda boundary
- **WHEN** a seller submits valid meeting coordinates within the Ciudad Ojeda boundary
- **THEN** the geographic containment check succeeds

### Requirement: Published offers belong to the approved catalog pairs
The system MUST reject any offer publication specifying a currency pair not present in the five approved MVP directional pairs.

#### Scenario: Seller submits an unapproved pair
- **WHEN** a seller attempts to publish an offer with an unsupported pair (such as Zelle or an unlisted fiat)
- **THEN** the system rejects the publication request

#### Scenario: Seller submits an approved catalog pair
- **WHEN** a seller publishes with an approved catalog pair such as `VES` to `USDT`
- **THEN** the pair validation succeeds

### Requirement: Atomic creation of offer and immutable initial terms version
The system MUST persist the offer record and its first terms version atomically within a single database transaction, setting the initial terms pointer and enforcing inventory non-negativity and PostGIS SRID 4326 geometry constraints.

#### Scenario: Publication commits offer and initial terms version atomically
- **WHEN** a valid offer publication request is processed
- **THEN** both the offer entity and its immutable terms version 1 are committed to the database, referencing each other consistently

#### Scenario: Transaction failure aborts all persistence
- **WHEN** an error or constraint violation occurs during terms version creation
- **THEN** the transaction rolls back, leaving no orphaned offer or terms records
