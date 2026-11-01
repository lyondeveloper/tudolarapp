# Design: Mandatory Authentication & Clean Marketplace Feed for V1

## Context

See `proposal.md` for motivation. The original prototype had accumulated several visual elements on `/home`:
- A guest viewing mode and escape buttons on `/sign-in`.
- Multi-row horizontal filter pills occupying prime screen space.
- A "Lista / Mapa Ojeda" view mode switcher that duplicated spatial search concepts.

In V1, all access requires authenticated credentials, and `/home` is streamlined into a clean feed.

## Goals / Non-Goals

**Goals:**
- Enforce `<RequireAuthenticated>` guard on `/home` and `/profile`.
- Remove guest browse controls (`sign-in-guest-browse`) from `/sign-in`.
- Remove dead guest branches/prompts from `/home` and `/profile`.
- Remove the "Lista / Mapa Ojeda" view toggle from `/home`.
- Extract canonical pair filters from fixed rows on `/home` into a compact modal/sheet (`FilterModal`), triggered by a clean search/filter button.
- Update all associated test suites and ensure 100% test pass rate.

**Non-Goals:**
- Changes to API backend endpoints or auth tokens.
- Altering the bottom dock destinations (`Ofertas`, `Buscar`, `Publicar`, `Acuerdos`, `Perfil`).

## Decisions

### 1. Re-wrap `/home` and `/profile` with `<RequireAuthenticated>`
- *Rationale*: Guarantees uniform redirection to `/sign-in` during unauthenticated state while respecting session restoration lifecycle.

### 2. Remove `sign-in-guest-browse` from `SignInForm`
- *Rationale*: With mandatory auth, there is no valid guest destination to escape to.

### 3. Remove "Lista / Mapa Ojeda" toggle
- *Rationale*: Spatial search and geocoded locations are already handled in `/search` with PostGIS proximity queries. The map toggle added clutter without functional value on the primary feed.

### 4. Move canonical pair filters to a modal
- *Rationale*: A search/filter trigger bar (`[ 🔍 Filtrar por par canónico... (Filtros ⚙️) ]`) keeps the header compact. Tapping it opens a modal or bottom sheet to select pairs (`ALL`, `VES_USDT`, etc.) and immediately updates the visible feed.

## Risks / Trade-offs

- **[Risk] Test suite breakages where guest viewing, map switcher, or inline filter pills were asserted** → *Mitigation*: Update `home-marketplace.spec.tsx`, `sign-in-form.spec.tsx`, `profile-screen.spec.tsx`, and `app-shell.anonymous.spec.tsx` to align with the streamlined layout.
