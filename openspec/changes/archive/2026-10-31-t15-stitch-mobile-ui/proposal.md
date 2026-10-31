# Proposal

Source: Notion T15 — https://app.notion.com/p/d358155c3492473581e0c058e08e3b36 — Implement the Existing Stitch Design in the Mobile App

## Why

The mobile client (`apps/mobile`) already has its session shell (`mobile/app-shell`) and the **Civic Trust Exchange** design token layer (`mobile/design-system`), but its authenticated screen (`/home`) is a minimal placeholder and none of the Stitch marketplace prototype screens exist yet. Implementing the approved Google Stitch design (`projects/14764001563531497625` — *"TUDOLAR P2P Marketplace Prototype"*) in the mobile app — backed by real `GET /users/me` + `POST /auth/sessions` where the API exists today and by an explicit, typed local preview/mock dataset for flows awaiting T04–T14 backend endpoints — gives the product and backend work a concrete, navigable UI baseline aligned with the approved T01/T02 ADRs.

## What Changes

- **Document the complete Stitch design mapping and ADR alignment** in `docs/design/stitch-mobile-mapping.md`, covering all 9 screens in Stitch project `projects/14764001563531497625`, their reusable components, tokens, navigation flows, and the explicit adaptations required by the T01/T02 ADRs (`ADR-0008`, `ADR-0009`, `ADR-0010`, `ADR-0013`, `ADR-0014`, `ADR-0015`, `ADR-0016`, `ADR-0017`, `ADR-0018`, `ADR-0021`, `ADR-0022`, `ADR-0024`).
- **Enhance the unauthenticated Stitch flows (`apps/mobile/src/app/sign-in.tsx`, `apps/mobile/src/app/register.tsx`, `apps/mobile/src/features/auth/`):**
  - Enrich `/sign-in` (Stitch screens `1.1 Inicio de Sesión y Passkeys` and `Inicio de Sesión - Passkey y Contraseña`) with the Civic Trust Exchange header, Ciudad Ojeda node badge, passkey/biometric entry card, non-custody privacy notice, and navigation link to registration (`/register`), while preserving the existing React Hook Form + RTK Query password sign-in (`testID="sign-in-identifier"`, `testID="sign-in-password"`, `testID="sign-in-submit"`) and all `mobile/app-shell` contracts.
  - Add `/register` (Stitch screen `1.2 Registro y Verificación`) built with React Hook Form (`displayName`, `username`, `email`, `phoneNumber`, frequent sector in Ciudad Ojeda, backup password, and the 3-point *Pacto de Confianza Ojeda* checkbox) with explicit preview-state feedback until T06 registration/verification endpoints land.
- **Replace the `/home` placeholder with the Stitch Marketplace Discovery & Navigation shell (`apps/mobile/src/app/home.tsx`, `apps/mobile/src/features/marketplace/`):**
  - Keep `/home` rendering the signed-in user's profile (`user.displayName`, `username`/`email`) and `"Signed in"` status badge from `useCurrentUserQuery()` so existing `mobile/app-shell` unit and Maestro E2E scenarios continue to pass.
  - Implement Stitch screen `2.1 Descubrimiento de Ofertas - Mercado Ojeda`: active market banner (`Mercado Activo: Ciudad Ojeda` with modal/sheet notice for Cabimas/Maracaibo pilot phases), deterministic filter chips (`Todos`, `VES → USD Efectivo`, `VES → USDT`, `USDT → VES`, `USD Efectivo`, `Pago Móvil`, `Radio < 5 km` per `ADR-0009` and `ADR-0017`), list/map view toggle, offer cards rendered with `code-num` tabular figures, and the permanent amber non-custody civic disclaimer (`warning` / `warning-border` / `warning-foreground`).
  - Provide the Stitch bottom navigation dock (`Ofertas`, `Buscar`, `Acuerdos`, `Publicar`) across the authenticated marketplace screens without using any Expo starter-template tab bar (`Home` / `Explore`).
- **Implement the remaining Stitch marketplace screens and modals with typed preview data (`apps/mobile/src/app/search.tsx`, `apps/mobile/src/app/offers/[id].tsx`, `apps/mobile/src/app/publish.tsx`, `apps/mobile/src/app/chat/[id].tsx`, `apps/mobile/src/app/agreements/[id]/confirm.tsx`):**
  - **Manual Search & Filter Refinement (`/search` — adapted from Stitch `2.0` per `ADR-0015`):** deterministic filter controls (canonical pair selector from the 5 MVP pairs, amount input, payment rail chips, sector/radius selector) and matching offers list, plus an explicit badge noting that natural-language AI interpretation is deferred in MVP (`ADR-0015`).
  - **Offer Detail & Public Meeting Safety Modal (`/offers/[id]` — Stitch `2.2 Detalle de Oferta y Perfil Vendedor`):** pair and rate callout in `code-num`, min/max limits and bolivar equivalent, seller conditions, identity/contact privacy card (without gamified star ratings or reputation percentages per `ADR-0013`), safe corridor & daytime schedule (`CC Ojeda Mall`, `9:00 AM – 4:00 PM`), 3-point *Protocolo de Cautela Cívica*, and the unskippable **Compromiso Cívico (Safety Handshake Modal)** requiring explicit acknowledgment before opening the private chat.
  - **Publish Offer Form (`/publish` — Stitch `4.1 Publicar Oferta - Vendedores`):** built with React Hook Form, canonical pair switcher (`ADR-0009`), seller-set exchange rate and optional margin (`0 <= margin < 100` per `ADR-0008`/`ADR-0010`, never labeled as "earnings" per `ADR-0018`), min/max give-asset limits (`> 0`, `min <= max`), pure bolivar equivalence calculation outside JSX, payment rail multi-select, safe meeting point selector in Ciudad Ojeda, daytime window notice, and amber non-custody disclaimer. Submissions in preview mode clearly indicate local preview state rather than server-confirmed persistence.
  - **Contextual Chat & Agreement Coordination (`/chat/[id]` — Stitch `3.1 Chat y Coordinación de Encuentro`):** offer context pill (`#TD-892`), permanent amber non-custody banner, real-time *Pacto de Encuentro* card (`Entregas` / `Recibes`, meeting point, time, dual actions `Aceptar Términos de Cita` and `Proponer otro punto` modal with verified Ojeda points), prevention checklist pills, message thread, quick-reply chips, message composer (React Hook Form), and the **Reportar Incidencia** modal.
  - **Post-Exchange Confirmation & Incident Escalation (`/agreements/[id]/confirm` — Stitch `3.2 Confirmación Post-Intercambio` adapted per `ADR-0013`):** outcome summary card (`Pacto Cumplido`), exchange breakdown (`Entregaste` / `Recibiste` in `code-num`), location/timestamp metadata, final civic verification checklist, and incident report pathway — omitting the 5-star rating and reputation score module excluded by `ADR-0013`.
- **Represent accessible loading, error, empty, and preview/offline states** across the marketplace screens using `gluestack-ui` primitives and Civic Trust Exchange tokens.

## Capabilities

### New Capabilities
- `mobile/stitch-marketplace-ui`: the Stitch Civic Trust Exchange screens, navigation flows, safety modals, React Hook Form inputs, and ADR-aligned preview states in the mobile client (`apps/mobile/`).

### Modified Capabilities
None. `mobile/app-shell` and `mobile/design-system` requirements remain intact and are satisfied without modification.

## Impact

- **Affected module:** `apps/mobile/` (`src/app/`, `src/features/auth/`, `src/features/marketplace/`, `src/components/`, `src/__tests__/`, `e2e/`) and `docs/design/stitch-mobile-mapping.md`.
- **Dependencies:** No new runtime dependencies or second server-state caches are added. Uses existing `expo-router`, `gluestack-ui` primitives, `@reduxjs/toolkit` + RTK Query (`src/services/api.ts`), `react-hook-form`, and `@expo-google-fonts/plus-jakarta-sans`.
- **Out of scope:**
  - Backend API implementation for markets, offers, search, chat, agreements, or moderation (covered by `T04`–`T14`).
  - Wiring real backend mutations for registration, market selection, offer publishing, search queries, chat messages, or agreement state transitions (covered by `T16`–`T19`).
  - Zelle pairs or rails (removed from MVP per `ADR-0009`).
  - Post-exchange 5-star ratings, reputation percentages, or gamified trust levels (excluded from MVP per `ADR-0013`).
  - LLM / natural-language prompt execution (deferred from MVP per `ADR-0015`).
  - Seller earnings or profit screens/labels (deferred from MVP per `ADR-0018`).
