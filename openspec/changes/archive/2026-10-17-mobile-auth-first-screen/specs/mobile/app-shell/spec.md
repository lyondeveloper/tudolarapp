# Spec Delta

## Purpose

Defines how the TUDOLAR mobile client boots, which screen it presents first, and how it moves
between the unauthenticated and authenticated states, so the app presents the product rather than
a starter template.

## ADDED Requirements

### Requirement: Sign-in is the first screen for an anonymous user

The mobile client SHALL present the sign-in screen as its initial screen when no session is
established.

#### Scenario: Cold start with no stored session

- **WHEN** the app starts and no refresh token is stored on the device
- **THEN** the sign-in screen is the first screen presented

#### Scenario: Sign-in screen accepts an identifier and a password

- **WHEN** the sign-in screen is presented
- **THEN** it offers a username-or-email field, a password field, and a submit control

### Requirement: No Expo starter-template screen or branding is presented

The mobile client SHALL NOT present any Expo starter-template screen, tab bar, or Expo branding.

#### Scenario: No template screens exist

- **WHEN** the app is launched
- **THEN** no "Welcome to Expo" screen, explore screen, or Expo badge is presented

#### Scenario: No tab bar is presented

- **WHEN** the app is launched
- **THEN** the client presents no bottom tab bar offering Home, Explore, and Sign in destinations

### Requirement: Session state is explicit before the client routes

The mobile client SHALL distinguish a session that is still being restored from one that is
anonymous or authenticated, and SHALL NOT present the sign-in screen while restoration is in
progress.

#### Scenario: Cold start with a stored session

- **WHEN** the app starts with a stored refresh token that the API accepts
- **THEN** the sign-in screen is not presented
- **AND** the authenticated screen is presented

#### Scenario: Cold start with a stored session the API rejects

- **WHEN** the app starts with a stored refresh token that the API rejects
- **THEN** the stored token is discarded
- **AND** the sign-in screen is presented

### Requirement: A successful sign-in presents the authenticated screen

The mobile client SHALL present the authenticated screen, and not the sign-in screen, after
credentials are accepted by the API.

#### Scenario: Accepted credentials

- **WHEN** a user submits an identifier and password that the API accepts
- **THEN** the authenticated screen is presented

#### Scenario: Rejected credentials

- **WHEN** a user submits an identifier and password that the API rejects
- **THEN** the sign-in screen remains presented
- **AND** an invalid-credentials message is shown without disclosing whether the account exists

### Requirement: The authenticated screen shows only the current user's own profile

The authenticated screen SHALL present the signed-in user's own profile as returned by the API's
private current-user endpoint, and SHALL NOT present credentials, tokens, or other secrets.

#### Scenario: Profile is shown

- **WHEN** the authenticated screen is presented for a signed-in user
- **THEN** the user's display name and account identity are shown

#### Scenario: No secrets are shown

- **WHEN** the authenticated screen is presented
- **THEN** no password, password hash, access token, or refresh token is rendered
