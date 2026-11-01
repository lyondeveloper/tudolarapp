# sellers/seller-eligibility Specification

## Purpose
Enforces seller publishing eligibility states, onboarding requirements, and privacy-preserving public profiles for the TUDOLAR P2P marketplace.

## Requirements

### Requirement: Persistent Seller Eligibility
The system SHALL persist seller eligibility as a distinct state separate from user identity and authentication status, defaulting un-onboarded users to `none`.

#### Scenario: Querying eligibility for new user
- **WHEN** an authenticated user with no prior seller onboarding queries their eligibility
- **THEN** the system returns eligibility state `none`

#### Scenario: Querying eligibility for active seller
- **WHEN** an eligible seller queries their eligibility
- **THEN** the system returns eligibility state `eligible`

### Requirement: Seller Onboarding and Activation
The system SHALL allow an authenticated user with verified contact credentials to complete seller onboarding and transition their eligibility state to `eligible`.

#### Scenario: Successful seller onboarding
- **WHEN** an authenticated user with verified email submits onboarding
- **THEN** the system sets their seller eligibility state to `eligible` and returns the updated state

#### Scenario: Onboarding without verified contact
- **WHEN** an unverified user attempts seller onboarding
- **THEN** the system rejects the request with a coded error requiring contact verification

### Requirement: Privacy-Preserving Public Seller Profile
The system SHALL expose a public seller profile containing only public trust signals, never exposing private contact credentials or account identifiers.

#### Scenario: Fetching public seller profile
- **WHEN** any client queries a seller's public profile by ID
- **THEN** the system returns only public fields (displayName, memberSince, eligibility state, and verification badges) and completely omits private email and phone numbers
