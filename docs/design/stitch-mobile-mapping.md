# Stitch Design Mapping & ADR Alignment (`t15-stitch-mobile-ui`)

- **Stitch Project:** `projects/14764001563531497625` — *"TUDOLAR P2P Marketplace Prototype"*
- **Design System:** *"Civic Trust Exchange"* (Light mode default, Plus Jakarta Sans with `code-num` tabular figures, 8px base corner radius, institutional deep blue `#0F4C81`, emerald sage `#059669`, preventative amber `#FEF3C7` / `#F59E0B` / `#92400E`).
- **Source Backlog Task:** Notion `T15 — Implement the Existing Stitch Design in the Mobile App`

---

## 1. Screen Inventory & Route Mapping (9 Stitch Screens)

| # | Stitch Screen ID | Stitch Title | Mobile Route (`apps/mobile/src/app/`) | State / Data Source in T15 |
| --- | --- | --- | --- | --- |
| 1 | `1c7522feeb58447e8bb4ee70132d232b` | `1.1 Inicio de Sesión y Passkeys` | `/sign-in` (`sign-in.tsx`) | Real `useSignInWithPasswordMutation` (`POST /auth/sessions`) + Passkey preview banner |
| 2 | `b561d28428cb4bdbb7a11cc18101f994` | `Inicio de Sesión - Passkey y Contraseña` | `/sign-in` (`sign-in.tsx`) | Consolidated with `1.1` into `/sign-in` so password and passkey entry coexist |
| 3 | `540af5fd8b2344f0bc416c1947e6d012` | `1.2 Registro y Verificación` | `/register` (`register.tsx`) | `react-hook-form` (`useRegisterForm`) + local preview submission state |
| 4 | `249da40d15ad407696f5953a01582dd8` | `2.1 Descubrimiento de Ofertas - Mercado Ojeda` | `/home` (`home.tsx`) | Real `useCurrentUserQuery` (`GET /users/me`) + typed `OFFERS_PREVIEW` catalog |
| 5 | `0fce124069de471a920c75e4379bb637` | `2.0 Búsqueda Inteligente IA y Matches` | `/search` (`search.tsx`) | `react-hook-form` deterministic filters + pure `filterOffers()` over `OFFERS_PREVIEW` |
| 6 | `ec5489c8f013472dbb60306321c693d2` | `2.2 Detalle de Oferta y Perfil Vendedor` | `/offers/[id]` (`offers/[id].tsx`) | `findOfferById(id)` from `OFFERS_PREVIEW` + `SafetyHandshakeModal` state |
| 7 | `211f18cd34804bf5ae4e12ab0d9331f0` | `3.1 Chat y Coordinación de Encuentro` | `/chat/[id]` (`chat/[id].tsx`) | `CONVERSATION_PREVIEW` + `react-hook-form` message composer + meeting-point & incident modals |
| 8 | `62eec696e4b34e2fbf2c562080c784a7` | `3.2 Confirmación y Calificación Post-Intercambio` | `/agreements/[id]/confirm` (`agreements/[id]/confirm.tsx`) | Agreement summary + 2-point civic verification checklist + incident escalation |
| 9 | `cb1e3cd272d84b35b3faaaa461a5df14` | `4.1 Publicar Oferta - Vendedores` | `/publish` (`publish.tsx`) | `react-hook-form` (`usePublishOfferForm`) + pure `calculateReceiveRange()` |

---

## 2. Token Mapping (`apps/mobile/src/global.css` & `src/theme/typography.ts`)

All screens consume semantic token classes from `src/global.css` and `textStyle('<level>')` from `src/theme/typography.ts` (zero literal `#hex` strings in screen or component source files):

| Stitch Design Token | Mobile CSS Variable / Utility Class | Role in Stitch Screens |
| --- | --- | --- |
| Primary (`#0F4C81`) | `bg-primary`, `text-primary`, `text-primary-foreground` | Primary CTAs (`Iniciar Sesión`, `Publicar Oferta en Ojeda`, `Iniciar Chat`), active filter chips, active bottom dock item |
| Secondary / Affirmative (`#059669`) | `bg-secondary`, `text-secondary`, `text-secondary-foreground`, `bg-success` | Affirmative actions (`Aceptar y Abrir Chat Privado`, `Aceptar Términos de Cita`, `Pacto Cumplido`), active market pulse |
| Preventative Amber (`#FEF3C7` / `#F59E0B` / `#92400E`) | `bg-warning`, `border-warning-border`, `text-warning-foreground` | Non-custody notices (`Plataforma Cívica Sin Custodia`), daytime window reminders, AI deferral / preview notices |
| Canvas & Surfaces (`#F8FAFC` / `#FFFFFF` / `#F1F5F9`) | `bg-background`, `bg-surface`, `bg-surface-muted`, `bg-card` | Base canvas (`bg-background`), offer/agreement cards (`bg-surface`), unselected chips (`bg-surface-muted`) |
| Outlines (`#CBD5E1` / `#E2E8F0`) | `border-outline`, `border-outline-variant`, `border-border` | Inputs and bottom dock (`border-outline`), offer cards (`border-border`) |
| Typography (`Plus Jakarta Sans`) | `textStyle('headline-lg-mobile')` .. `textStyle('label-sm')`, `textStyle('code-num')` | All headings, body copy, labels, and tabular monetary amounts (`code-num`) |

---

## 3. Component Mapping (`apps/mobile/src/features/`)

| Stitch Component | Mobile Implementation | Responsibilities |
| --- | --- | --- |
| Selector de Mercado Activo (`Ciudad Ojeda`) | `src/features/marketplace/components/market-node-banner.tsx` | Displays active market (`Ciudad Ojeda`), municipal polygon scope (`Polígono Lagunillas`), and expandable/modal pilot phase info (`Cabimas y Maracaibo: Próxima fase piloto`). |
| Banner Cívico de No Custodia | `src/features/marketplace/components/civic-notice-banner.tsx` | Renders the preventative amber alert (`bg-warning border-warning-border text-warning-foreground`) for non-custody and daytime safety notices. |
| Tarjeta de Oferta P2P | `src/features/marketplace/components/offer-card.tsx` | Displays seller display name, neutral verification context badge, canonical pair label, tabular rate and min/max limits (`code-num`), payment rails, safe corridor distance, and navigation to `/offers/[id]`. |
| Barra Inferior de Navegación (Level 2 Dock) | `src/features/marketplace/components/bottom-dock.tsx` | Thumb-accessible dock with 4 destinations: `Ofertas` (`/home`), `Buscar` (`/search`), `Acuerdos` (`/chat/td-892`), and `Publicar` (`/publish`). Never uses starter-template labels `Home` or `Explore`. |
| Modal de Compromiso Cívico (Safety Handshake) | `src/features/marketplace/components/safety-handshake-modal.tsx` | Unskippable 3-point public meeting safety checklist on `/offers/[id]` requiring active checkbox acknowledgment before opening `/chat/[id]`. |

---

## 4. Documented Gaps & Adaptations Required by Approved ADRs

Per `T15` (*"Do not redesign from scratch; document any gaps and request approval before changing the design"*), the following elements in the raw Stitch HTML are adapted to comply with the approved T01/T02 ADRs:

1. **Canonical Pairs & Removal of Zelle (`ADR-0005`, `ADR-0009`):**
   - Only the 5 canonical pairs (`VES_USD_CASH`, `VES_USDT`, `USDT_VES`, `USDT_USD_CASH`, `VES_BANK_TO_VES_CASH`) on 3 assets (`VES`, `USD`, `USDT`) and 4 rails (`VES_CASH`, `VES_BANK_TRANSFER`, `USD_CASH`, `USDT_TRANSFER`) are selectable or displayed.
2. **Seller-Set Commercial Values & Optional Margin (`ADR-0008`, `ADR-0010`):**
   - Stitch `4.1` showed `"Ref. Hoy: 39,20 VES"` and `"+0.00% respecto a media de mercado"`. Per `ADR-0008`, the platform publishes no reference rate and computes none. `/publish` lets the seller enter their own rate (`rate > 0` for cross-asset pairs, omitted for `VES_BANK_TO_VES_CASH`) and an optional margin percentage (`0 <= margin < 100` per `ADR-0010`).
3. **No KYC / Cédula Collection & No Reputation or Star Ratings (`ADR-0013`):**
   - Stitch `1.2` included a Venezuelan `Cédula de Identidad` field, Stitch `2.1`/`2.2` showed `"98% reputación positiva"`, `"Calificación 5.0"`, `"Nivel 3"`, and `"Puntuación de puntualidad 4.9 / 5.0"`, and Stitch `3.2` included a 5-star post-exchange rating widget.
   - Per `ADR-0013`, the MVP has no identity document KYC and **no reputation signals or star ratings**. `/register` omits the `Cédula` field; offer cards and `/offers/[id]` show neutral account/corridor context (`Cuenta activa en Ciudad Ojeda`, `Teléfono protegido`), and `/agreements/[id]/confirm` replaces the 5-star rating module with the final civic verification checklist and incident report pathway.
4. **Deferred Subscriptions (`ADR-0014`):**
   - Stitch `4.1` showed `"Plan Vendedor Pro • 3 de 5 publicaciones usadas este mes"`. Per `ADR-0014`, subscriptions are deferred in the MVP and sellers are entitled through the pilot entitlement mechanism. `/publish` displays `"Habilitación Piloto Activa (Suscripciones diferidas en MVP)"`.
5. **Deferred Natural-Language AI Search (`ADR-0015`):**
   - Stitch `2.0` showed an LLM conversational prompt box (`Asistente IA de Mercado`). Per `ADR-0015`, natural-language search is deferred in the MVP and only manual deterministic filters ship. `/search` preserves the Stitch `2.0` layout and match cards while replacing the AI prompt box with deterministic manual filter controls and an explicit `ADR-0015` notice.
6. **Default Search Radius (`ADR-0017`):**
   - Stitch `2.1` showed a `Radio < 3km` chip. Per `ADR-0017`, the default proximity radius is `5 km` bounded by the Ciudad Ojeda market polygon (`Radio < 5 km`).
7. **Deferred Seller Earnings (`ADR-0018`):**
   - No screen labels seller margin or transaction history as `"ganancias"` or `"earnings"`.
