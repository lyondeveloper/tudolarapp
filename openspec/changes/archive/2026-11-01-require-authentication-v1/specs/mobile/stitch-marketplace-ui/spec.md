# Spec Delta: mobile/stitch-marketplace-ui

## MODIFIED Requirements

### Requirement: Stitch Civic Trust Exchange screens and bottom dock are navigable

The mobile client SHALL present the Stitch Civic Trust Exchange marketplace discovery feed on `/home` only to authenticated users, gating anonymous access via the `<RequireAuthenticated>` session guard to redirect to `/sign-in`, with a clean offer feed, modal-driven filters, and a five-destination bottom navigation dock (`Ofertas`, `Buscar`, `Publicar`, `Acuerdos`, `Perfil`) anchored at the bottom of the viewport, omitting the redundant map view toggle.

#### Scenario: Authenticated home presents marketplace discovery and profile summary

- **WHEN** an authenticated user reaches `/home`
- **THEN** the screen displays the signed-in user's display name, account identity, and `"Signed in"` indicator alongside the Ciudad Ojeda active market banner, filter trigger modal, offer cards, non-custody civic disclaimer, and the bottom navigation dock, without rendering the legacy map toggle

#### Scenario: Guest home presents marketplace discovery with guest prompt

- **WHEN** an anonymous user reaches `/home`
- **THEN** the client redirects the user to `/sign-in` via `<RequireAuthenticated>` and does not render the marketplace discovery feed or any guest prompt

#### Scenario: Bottom navigation dock navigates across core Stitch flows

- **WHEN** an authenticated user taps `Ofertas`, `Buscar`, `Publicar`, `Acuerdos`, or `Perfil` on the bottom dock
- **THEN** the client navigates to the corresponding screen (`/home`, `/search`, `/publish`, `/chat/td-892`, or `/profile`) without rendering any Expo starter-template `Home` or `Explore` tab bar

### Requirement: Sign-in and registration screens reflect the Stitch auth flows

The mobile client SHALL present global identity authentication on `/sign-in` and `/register` decoupled from municipal nodes, featuring civic trust presentation, elevated form controls, passkey quick action, local privacy notice, and registration navigation, without guest marketplace bypass.

#### Scenario: Sign-in presents passkey entry card, civic privacy notice, and registration link

- **WHEN** an anonymous user views `/sign-in`
- **THEN** the screen presents global identity branding, passkey entry option, username/email and password fields (`sign-in-identifier`, `sign-in-password`, `sign-in-submit`), local privacy notice, and a control to navigate to `/register` without municipal node constraint

#### Scenario: Sign-in presents guest exploration option

- **WHEN** an anonymous user views `/sign-in`
- **THEN** the screen does not provide any guest marketplace browse control (`sign-in-guest-browse`)

#### Scenario: Registration validates required fields and the civic trust pact

- **WHEN** an anonymous user submits `/register` with missing required fields or without accepting the three-point civic trust pact
- **THEN** the form prevents submission and renders inline validation messages for each missing requirement

### Requirement: Profile screen displays global account identity and session controls

The mobile client SHALL present a dedicated profile screen on `/profile` protected by the `<RequireAuthenticated>` guard, displaying account details, verification badges, seller eligibility, active market node selector, and session controls only to authenticated users.

#### Scenario: Authenticated user inspects profile

- **WHEN** an authenticated user views `/profile`
- **THEN** the screen displays the user's display name, username, email verification status, phone verification status, seller eligibility state, active market node switcher, and a sign-out control

#### Scenario: Guest user views profile screen

- **WHEN** an anonymous user views `/profile`
- **THEN** the client redirects the user to `/sign-in` through the `<RequireAuthenticated>` guard
