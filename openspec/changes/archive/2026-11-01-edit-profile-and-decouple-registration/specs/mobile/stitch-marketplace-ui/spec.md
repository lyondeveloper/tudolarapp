# Spec Delta: mobile/stitch-marketplace-ui

## MODIFIED Requirements

### Requirement: Sign-in and registration screens reflect the Stitch auth flows

The mobile client SHALL present global identity authentication on `/sign-in` and `/register` decoupled from municipal nodes and geographic sectors, featuring civic trust presentation, elevated form controls, passkey quick action, local privacy notice, and registration navigation, without guest marketplace bypass.

#### Scenario: Sign-in presents passkey entry card, civic privacy notice, and registration link

- **WHEN** an anonymous user views `/sign-in`
- **THEN** the screen presents global identity branding, passkey entry option, username/email and password fields (`sign-in-identifier`, `sign-in-password`, `sign-in-submit`), local privacy notice, and a control to navigate to `/register` without municipal node constraint

#### Scenario: Sign-in presents guest exploration option

- **WHEN** an anonymous user views `/sign-in`
- **THEN** the screen does not provide any guest marketplace browse control (`sign-in-guest-browse`)

#### Scenario: Registration validates required fields and the civic trust pact

- **WHEN** an anonymous user submits `/register` with missing required fields or without accepting the three-point civic trust pact
- **THEN** the form prevents submission, renders inline validation messages for each missing requirement, and omits any municipal node or frequent sector selection

### Requirement: Profile screen displays global account identity and session controls

The mobile client SHALL present a dedicated profile screen on `/profile` protected by the `<RequireAuthenticated>` guard, displaying account details, verification badges, seller eligibility, active market node selector, profile modification controls, and session controls only to authenticated users.

#### Scenario: Authenticated user inspects profile

- **WHEN** an authenticated user views `/profile`
- **THEN** the screen displays the user's display name, username, email verification status, phone verification status, seller eligibility state, active market node switcher, an edit profile action to modify account details, and a sign-out control

#### Scenario: Guest user views profile screen

- **WHEN** an anonymous user views `/profile`
- **THEN** the client redirects the user to `/sign-in` through the `<RequireAuthenticated>` guard
