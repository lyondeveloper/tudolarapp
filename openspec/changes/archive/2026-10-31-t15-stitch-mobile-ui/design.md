# Design

## Context

`apps/mobile` is a React Native + Expo SDK 57 client (`expo-router`, `gluestack-ui` v5 with `uniwind` + Tailwind v4 CSS variables in `src/global.css`, `@reduxjs/toolkit` + RTK Query in `src/services/api.ts`, and `react-hook-form`). Two prior slices (`mobile-auth-first-screen` and `mobile-design-system`) established:
1. Session-gated routing (`/` -> `/sign-in` when anonymous, `/home` when authenticated) tested by `src/__tests__/app-shell.*.spec.tsx` and Maestro flows `e2e/01-sign-in-is-first.yaml`, `02-rejected-credentials.yaml`, and `03-accepted-credentials.yaml`.
2. The **Civic Trust Exchange** design token layer in `src/global.css` and `src/theme/typography.ts`, verified by `src/theme/design-tokens.spec.ts`, `src/__tests__/sign-in-tokens.spec.tsx`, and `src/__tests__/home-tokens.spec.tsx` (which enforce zero literal `#hex` colors in screen sources).

Google Stitch project `projects/14764001563531497625` (*"TUDOLAR P2P Marketplace Prototype"*) defines 9 screens. Meanwhile, T01 and T02 produced ADRs `0001`–`0027` that constrain what the MVP UI may display or imply. Backend endpoints for markets (`T04`/`T05`), registration/verification (`T06`), seller eligibility/entitlements (`T07`/`T08`), offers (`T09`), search (`T10`/`T11`), chat (`T12`), agreements (`T13`), and trust/safety (`T14`) are not implemented yet, so T15 builds the complete Stitch UI and navigation foundation using real auth/profile state (`POST /auth/sessions`, `POST /auth/sessions/refresh`, `GET /users/me`) and an explicitly labeled, typed local preview dataset for the marketplace flows.

## Goals / Non-Goals

**Goals:**
- Map all 9 Stitch screens in `projects/14764001563531497625` to concrete Expo Router routes, reusable `gluestack-ui` components, pure domain helpers, and custom hooks.
- Document and resolve every conflict between the Stitch prototype HTML and the approved ADRs (`ADR-0008`, `ADR-0009`, `ADR-0010`, `ADR-0013`, `ADR-0014`, `ADR-0015`, `ADR-0016`, `ADR-0017`, `ADR-0018`, `ADR-0021`, `ADR-0022`).
- Keep all existing unit tests and Maestro E2E flows green while adding unit and E2E coverage for the Stitch flows.
- Respect React and React Native rules in `AGENTS.md`: pure presentation components, pure domain/view calculations outside components, no `useEffect` for derived state or user events, React Hook Form for every form, RTK Query as the sole remote-state cache, and explicit preview/offline banners so local actions are never misrepresented as server-confirmed writes.

**Non-Goals:**
- Adding backend endpoints or database migrations (`apps/api` is untouched).
- Adding a second server-state library or storing tokens outside `expo-secure-store`.
- Implementing native WebAuthn/Passkey OS ceremony (`T06`/`T16` scope; `/sign-in` renders the Stitch passkey card with an explicit preview notice until T16 wires the native ceremony).

## Decisions

### 1. Stitch Screen-to-Route Mapping & ADR Adaptations

| Stitch Screen ID & Title | Expo Router Route | Backing State in T15 | ADR Alignment & Adaptations |
| --- | --- | --- | --- |
| `1c7522feeb58447e8bb4ee70132d232b` (*1.1 Inicio de Sesión y Passkeys*) + `b561d28428cb4bdbb7a11cc18101f994` (*Inicio de Sesión - Passkey y Contraseña*) | `/sign-in` (`src/app/sign-in.tsx`) | Real RTK Query `useSignInWithPasswordMutation` + passkey preview banner | Consolidates both Stitch sign-in variants into one screen with the Ciudad Ojeda node badge, passkey entry card, React Hook Form credentials (`sign-in-identifier`, `sign-in-password`, `sign-in-submit`), local privacy notice, and link to `/register`. |
| `540af5fd8b2344f0bc416c1947e6d012` (*1.2 Registro y Verificación*) | `/register` (`src/app/register.tsx`) | React Hook Form + preview submission state | Adapts fields to the approved identity model (`displayName`, `username`, `email`, optional `phoneNumber`, frequent sector in Ciudad Ojeda, password, and the 3-point *Pacto de Confianza Ojeda* checkbox). Removes mandatory Venezuelan `Cédula` collection per `ADR-0013` (no KYC/identity document verification in MVP). |
| `249da40d15ad407696f5953a01582dd8` (*2.1 Descubrimiento de Ofertas - Mercado Ojeda*) | `/home` (`src/app/home.tsx`) | Real `useCurrentUserQuery()` for signed-in header + typed preview catalog for Ciudad Ojeda offers | Preserves `"Signed in"` badge and `user.displayName` / `identity` for `mobile/app-shell` compatibility. Uses only the 5 canonical pairs from `ADR-0009` (`VES_USD_CASH`, `VES_USDT`, `USDT_VES`, `USDT_USD_CASH`, `VES_BANK_TO_VES_CASH`). Replaces reputation scores (`98% reputación`, `Calificación 5.0`) with neutral context badges (`Identidad de cuenta activa`, `Punto público sugerido`) per `ADR-0013`. Uses `< 5 km` default radius chip per `ADR-0017`. |
| `0fce124069de471a920c75e4379bb637` (*2.0 Búsqueda Inteligente IA y Matches*) | `/search` (`src/app/search.tsx`) | Pure deterministic filter function over preview catalog + React Hook Form filter state | Per `ADR-0015`, natural-language LLM search is deferred in MVP. `/search` renders the Stitch search layout adapted to **deterministic manual filters** (canonical pair, amount, payment rail, Ciudad Ojeda sector/radius) and displays an explicit informational banner that AI natural-language parsing is deferred (`ADR-0015`). |
| `ec5489c8f013472dbb60306321c693d2` (*2.2 Detalle de Oferta y Perfil Vendedor*) | `/offers/[id]` (`src/app/offers/[id].tsx`) | Preview offer lookup by `id` + local modal state | Displays pair, seller-set rate (`code-num`), min/max limits and VES equivalent, seller conditions, protected contact info (`ADR-0013`), safe corridor (`CC Ojeda Mall`, `9:00 AM – 4:00 PM`), 3-point caution checklist, and the **Compromiso Cívico** safety handshake modal that must be acknowledged before navigating to `/chat/[id]`. Removes reputation percentage (`98%`), punctuality stars (`4.9 / 5.0`), and `Nivel 3` badge per `ADR-0013`. |
| `211f18cd34804bf5ae4e12ab0d9331f0` (*3.1 Chat y Coordinación de Encuentro*) | `/chat/[id]` (`src/app/chat/[id].tsx`) | Local conversation & agreement preview state + React Hook Form message composer | Renders offer context pill (`#TD-892`), permanent amber non-custody notice, *Pacto de Encuentro* card (`Entregas` / `Recibes`, venue, daytime slot, `Aceptar Términos de Cita` -> `/agreements/[id]/confirm`, `Proponer otro punto` modal with verified Ojeda locations), prevention pills, message thread, quick-reply chips, and the *Reportar Incidencia* modal. |
| `62eec696e4b34e2fbf2c562080c784a7` (*3.2 Confirmación y Calificación Post-Intercambio*) | `/agreements/[id]/confirm` (`src/app/agreements/[id]/confirm.tsx`) | Local agreement confirmation state | Renders *Pacto Cumplido* outcome card, `Entregaste` / `Recibiste` breakdown in `code-num`, venue/time metadata, final 2-point civic verification checklist, and incident report button. **Omits** the 5-star rating selector, feedback badges, and community rating comment per `ADR-0013` (no reputation signals in MVP). |
| `cb1e3cd272d84b35b3faaaa461a5df14` (*4.1 Publicar Oferta - Vendedores*) | `/publish` (`src/app/publish.tsx`) | React Hook Form + pure quote/equivalence helper | Canonical 5-pair selector (`ADR-0009`), seller-set rate (`ADR-0008`, no platform reference rate), optional margin percentage (`0 <= margin < 100` per `ADR-0010`, never labeled as "earnings" per `ADR-0018`), min/max give-asset limits (`> 0`, `min <= max`), pure equivalence calculation in `code-num`, payment rail multi-select, safe meeting point selector, daytime notice, and amber non-custody disclaimer. Shows temporary pilot entitlement badge (`ADR-0014`) instead of paid "Plan Vendedor Pro". |

### 2. Layer Organization Inside `apps/mobile/src/`

Following `AGENTS.md` (pure domain helpers separated from React hooks and pure presentation components):
- `src/features/marketplace/domain/`:
  - `catalog.ts` & `catalog.spec.ts`: Canonical MVP pairs (`VES_USDT`, `VES_BANK_TO_VES_CASH`, `VES_USD_CASH`, `USDT_VES`, `USDT_USD_CASH`), assets (`VES`, `USD`, `USDT`), rails (`VES_CASH`, `VES_BANK_TRANSFER`, `USD_CASH`, `USDT_TRANSFER`), Ciudad Ojeda safe corridors, and pure formatting/validation/equivalence functions (`calculateReceiveRange`, `filterOffers`, `validateOfferDraft`).
  - `preview-data.ts` & `preview-data.spec.ts`: Typed, deterministicCiudad Ojeda preview dataset (`OFFERS_PREVIEW`, `CONVERSATION_PREVIEW`, `SAFE_CORRIDORS_PREVIEW`) with explicit `isPreviewData: true` metadata and zero prohibited fields (no Zelle, no star ratings, no earnings labels).
- `src/features/marketplace/components/`:
  - `civic-notice-banner.tsx` & `civic-notice-banner.spec.tsx`: Reusable amber non-custody & physical-safety alert (`bg-warning border-warning-border text-warning-foreground`).
  - `market-node-banner.tsx` & `market-node-banner.spec.tsx`: Active market header (`Mercado Activo: Ciudad Ojeda`) with expandable/modal info on municipal geofencing and upcoming pilot phases (`Cabimas y Maracaibo: Próxima fase piloto`).
  - `offer-card.tsx` & `offer-card.spec.tsx`: Stitch P2P Offer Card using `code-num` tabular figures for rates and limits.
  - `bottom-dock.tsx` & `bottom-dock.spec.tsx`: Stitch Level-2 one-handed bottom navigation dock (`Ofertas`, `Buscar`, `Acuerdos`, `Publicar`).
  - `safety-handshake-modal.tsx` & `safety-handshake-modal.spec.tsx`: Unskippable 3-point public meeting safety checklist modal on `/offers/[id]`.
- `src/features/marketplace/use-publish-offer-form.ts` & `use-publish-offer-form.spec.ts`: React Hook Form hook for `/publish`.
- `src/features/auth/register-form.tsx` & `register-form.spec.tsx`: React Hook Form registration form for `/register`.

### 3. Preserving Existing `mobile/app-shell` and `mobile/design-system` Contracts

- `app-shell.anonymous.spec.tsx` asserts that on `/sign-in`, `screen.queryByText('Explore')` and `screen.queryByText('Home')` are `null`. Neither `/sign-in` nor the authenticated `BottomDock` (`Ofertas`, `Buscar`, `Acuerdos`, `Publicar`) uses the words `Home` or `Explore`.
- `app-shell.authenticated.spec.tsx` asserts that on `/home`, `Demo User` is visible, `Username or email` is `null`, and `screen.queryByText(/password/i)` is `null`. `/home` and its child components must never render the word `password`.
- `03-accepted-credentials.yaml` asserts `Signed in` and `E2E Demo` are visible after signing in. `/home` keeps the `Signed in` heading/badge and user display name at the top of the screen.
- `sign-in-tokens.spec.tsx` and `home-tokens.spec.tsx` scan screen sources with `/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/`. Every new and updated file in `src/` must use token classes (`bg-primary`, `bg-secondary`, `bg-warning`, `border-warning-border`, `text-warning-foreground`, `bg-surface`, `bg-surface-muted`, `border-border`, `text-foreground`, `text-muted-foreground`) and never contain literal `#hex` strings (even in comments).

## Risks / Trade-offs

- **[Risk] Mocked marketplace data could be mistaken for live server persistence** → Mitigation: Every preview screen and form submission renders an explicit `Modo Vista Previa Local (Sin conexión a endpoints T04–T14)` badge or confirmation notice, satisfying the React Native rule in `AGENTS.md` (*"Do not present local writes as server-confirmed"*).
- **[Risk] Long scrollable screens on small viewports could hide Maestro E2E targets** → Mitigation: Keep primary identity (`Signed in`, `user.displayName`), navigation controls, and `testID`s accessible near the top or in the fixed bottom dock, and use `testID` selectors in Maestro flows.
