# mobile/stitch-marketplace-ui Specification

## Purpose
Defines the mobile presentation and interactive workflows derived from the Stitch Civic Trust Exchange prototype for Ciudad Ojeda, establishing client-side discovery, deterministic search, offer detail with safety handshake gating, contextual P2P coordination, post-exchange confirmation, and publish offer preview while adhering strictly to MVP pair and non-custody constraints.

## Requirements

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

### Requirement: Marketplace screens enforce ADR pair, reputation, search, and earnings boundaries

The mobile client SHALL restrict offer pairs and rails to the five canonical MVP pairs (`VES_USDT`, `VES_BANK_TO_VES_CASH`, `VES_USD_CASH`, `USDT_VES`, `USDT_USD_CASH`), omit reputation scores and star ratings, use deterministic manual search filters, and never label seller margin as earnings or profit.

#### Scenario: No Zelle, reputation score, star rating, or earnings label is rendered

- **WHEN** any Stitch marketplace screen (`/home`, `/search`, `/offers/[id]`, `/publish`, `/chat/[id]`, `/agreements/[id]/confirm`) is rendered
- **THEN** no Zelle pair or rail, no reputation percentage or 5-star rating control, and no "earnings" or "ganancias" label is presented

#### Scenario: Search screen provides deterministic manual filters with AI deferral notice

- **WHEN** a user opens `/search`
- **THEN** the screen provides deterministic filter controls for canonical pair, amount, payment rail, and Ciudad Ojeda sector/radius, and displays an explicit notice that natural-language AI search is deferred in the MVP

### Requirement: Offer detail requires the public meeting safety checklist before chat

The offer detail screen (`/offers/[id]`) SHALL present the offer terms, tabular rate and limits, safe corridor details, and non-custody notice, and SHALL require the user to acknowledge the three-point public meeting safety checklist before opening the private conversation.

#### Scenario: Safety handshake modal gates entry to the conversation screen

- **WHEN** a user taps the primary action to start a chat on `/offers/[id]`
- **THEN** the client opens the `Compromiso Cívico` safety checklist modal and keeps the confirm action disabled until the user acknowledges the public daytime meeting rules

#### Scenario: Confirming the safety handshake navigates to the offer conversation

- **WHEN** the user acknowledges the safety checklist on `/offers/[id]` and taps `Aceptar y Abrir Chat Privado`
- **THEN** the modal closes and the client navigates to `/chat/[id]`

### Requirement: Publish offer form validates terms and computes equivalents with pure functions

The publish offer screen (`/publish`) SHALL validate seller-set commercial values (`rate > 0` for cross-asset pairs, optional `0 <= margin < 100`, `minAmount > 0`, `minAmount <= maxAmount`, required payment rail and safe meeting point) and SHALL label preview submissions explicitly until backend publishing is connected.

#### Scenario: Publish form rejects invalid limits or margin and computes VES equivalent

- **WHEN** a user enters minimum and maximum amounts and a rate on `/publish`
- **THEN** the screen displays the calculated equivalent range in tabular figures, rejects `minAmount > maxAmount` or `margin >= 100`, and upon valid submission shows an explicit preview-mode confirmation notice

### Requirement: Chat and post-exchange confirmation support agreement actions and incident reporting

The conversation screen (`/chat/[id]`) and post-exchange confirmation screen (`/agreements/[id]/confirm`) SHALL present the non-custody notice, agreement terms card, alternate safe meeting point picker, final civic verification checklist, and incident report modal.

#### Scenario: User can propose a verified safe meeting point, confirm the agreement, or open an incident report

- **WHEN** a user interacts with `/chat/[id]` or `/agreements/[id]/confirm`
- **THEN** the user can inspect the agreement breakdown, select a verified Ciudad Ojeda meeting point, transition to the post-exchange confirmation checklist, or open the `Reportar Incidencia` modal

### Requirement: Profile screen displays global account identity and session controls

The mobile client SHALL present a dedicated profile screen on `/profile` protected by the `<RequireAuthenticated>` guard, displaying account details, verification badges, seller eligibility, active market node selector, and session controls only to authenticated users.

#### Scenario: Authenticated user inspects profile

- **WHEN** an authenticated user views `/profile`
- **THEN** the screen displays the user's display name, username, email verification status, phone verification status, seller eligibility state, active market node switcher, and a sign-out control

#### Scenario: Guest user views profile screen

- **WHEN** an anonymous user views `/profile`
- **THEN** the client redirects the user to `/sign-in` through the `<RequireAuthenticated>` guard
