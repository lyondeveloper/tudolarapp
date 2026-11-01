# Spec Delta

## Purpose

Enables secure user registration and contact verification for the TUDOLAR P2P marketplace, ensuring verified email and phone contact without custody or escrow.

## ADDED Requirements

### Requirement: User Registration With Password
The system SHALL allow new users to register an account using display name, unique username, email address, and secure password.

#### Scenario: Successful password registration
- **WHEN** user submits valid registration details with accepted civic pact
- **THEN** system creates identity record in pending state and responds with HTTP 202 Accepted without leaking authentication tokens

#### Scenario: Duplicate username or email rejection
- **WHEN** user submits registration with already registered username or email
- **THEN** system responds with a coded error and mobile UI displays actionable error feedback

### Requirement: Mandatory Civic Pact Acceptance
The registration interface MUST require explicit acknowledgement of the Pacto de Confianza Ojeda before submitting registration.

#### Scenario: Submitting without accepting pact
- **WHEN** user attempts to submit registration without checking the civic pact
- **THEN** client prevents submission and highlights the civic agreement requirement

### Requirement: Phone Verification Challenge Lifecycle
The system SHALL provide endpoints and client actions to issue and verify 6-digit SMS challenges for contact verification.

#### Scenario: Requesting phone verification challenge
- **WHEN** authenticated user submits a valid E.164 phone number
- **THEN** system issues a timed SMS challenge code and returns HTTP 202 Accepted

#### Scenario: Successfully validating phone challenge
- **WHEN** authenticated user submits the correct 6-digit challenge code
- **THEN** system marks the phone number as verified and returns HTTP 200 OK
