# Spec Delta

## MODIFIED Requirements

### Requirement: Stitch Civic Trust Exchange screens and bottom dock are navigable

The mobile client SHALL present the Stitch Civic Trust Exchange marketplace discovery feed on `/home` accessible to both guest and authenticated users, with a four-destination bottom navigation dock (`Ofertas`, `Buscar`, `Acuerdos`, `Publicar`) anchored at the bottom of the viewport, preserving the signed-in user profile summary when authenticated and a welcoming guest banner when unauthenticated.

#### Scenario: Authenticated home presents marketplace discovery and profile summary

- **WHEN** an authenticated user reaches `/home`
- **THEN** the screen displays the signed-in user's display name, account identity, and `"Signed in"` indicator alongside the Ciudad Ojeda active market banner, deterministic filter chips, offer cards, non-custody civic disclaimer, and the bottom navigation dock

#### Scenario: Guest home presents marketplace discovery with guest prompt

- **WHEN** an anonymous user reaches `/home`
- **THEN** the screen displays the Ciudad Ojeda active market banner, deterministic filter chips, offer cards, non-custody civic disclaimer, and bottom navigation dock with a prompt to sign in for publishing or agreements

#### Scenario: Bottom navigation dock navigates across core Stitch flows

- **WHEN** an authenticated user taps `Ofertas`, `Buscar`, `Acuerdos`, or `Publicar` on the bottom dock
- **THEN** the client navigates to the corresponding Stitch screen (`/home`, `/search`, `/chat/td-892`, or `/publish`) without rendering any Expo starter-template `Home` or `Explore` tab bar

### Requirement: Sign-in and registration screens reflect the Stitch auth flows

The mobile client SHALL present the Stitch passkey and credential sign-in presentation on `/sign-in` featuring branded header, civic hero trust card, elevated form container with comfortable input heights and icons, passkey quick action, local privacy notice, and navigation to both `/register` and guest marketplace exploration.

#### Scenario: Sign-in presents passkey entry card, civic privacy notice, and registration link

- **WHEN** an anonymous user views `/sign-in`
- **THEN** the screen presents the Ciudad Ojeda node badge, passkey entry option, username/email and password fields (`sign-in-identifier`, `sign-in-password`, `sign-in-submit`), local privacy notice, and a control to navigate to `/register`

#### Scenario: Sign-in presents guest exploration option

- **WHEN** an anonymous user views `/sign-in`
- **THEN** the screen provides a control to browse the marketplace as a guest (`sign-in-guest-browse`) that navigates to `/home`

#### Scenario: Registration validates required fields and the civic trust pact

- **WHEN** an anonymous user submits `/register` with missing required fields or without accepting the three-point civic trust pact
- **THEN** the form prevents submission and renders inline validation messages for each missing requirement
