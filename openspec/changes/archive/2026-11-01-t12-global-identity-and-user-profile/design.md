# Design

## Context

See `proposal.md` for motivation. Per AGENTS.md, identity and authentication are global, while market nodes are local geographic contexts that users can select and switch freely. Showing "Nodo Activo: Ciudad Ojeda" on `/sign-in` incorrectly implied that user accounts belong to a specific city. Additionally, users need a dedicated `/profile` screen reachable via the bottom dock to inspect their credentials, verification status, switch active nodes, and log out.

## Goals / Non-Goals

**Goals:**
- Remove municipal node badges from `/sign-in` and `/register`, presenting global identity.
- Add `Perfil` (`/profile`) as a fifth tab in `BottomDock`.
- Create `/profile` (`profile.tsx`) displaying user profile info, verification statuses, seller eligibility, active market node selector, and logout action.
- Support guest state gracefully on `/profile` with a prompt to sign in.

**Non-Goals:**
- Modifying backend user endpoints or authentication tokens.
- Native biometrics enrollment (Passkeys ceremony deferred to T16).

## Decisions

1. **Five-Tab Bottom Dock**:
   - *Decision*: Order tabs as `Ofertas` (`/home`), `Buscar` (`/search`), `Publicar` (`/publish`), `Acuerdos` (`/chat/td-892`), `Perfil` (`/profile`).
   - *Rationale*: Standard mobile app tab structure (Home, Search, Action, Activity, Profile).
   - *Alternative Considered*: Floating profile avatar in the top header only. Rejected because bottom tabs provide instant thumb access across every screen.

2. **Decoupling Node Context from Identity**:
   - *Decision*: Strip municipal banners from `SignInForm` and `RegisterForm`. Market node selection lives in the marketplace (`/home`) and profile (`/profile`).
   - *Rationale*: Preserves the invariant that accounts are global across Venezuela and future expansion markets.

3. **Profile Screen Architecture**:
   - *Decision*: Connect `useCurrentUserQuery`, `useSellerEligibilityQuery`, `useLogoutMutation`, and Redux market state (`activeMarketId`).
   - *Rationale*: Reuses existing RTK Query endpoints without adding redundant state.

## Risks / Trade-offs

- **[Risk]** Existing tests asserting `Nodo Activo` on `/sign-in` will fail.
  - *Mitigation*: Update `sign-in-form.spec.tsx` to assert global identity header rather than municipal node banner.
