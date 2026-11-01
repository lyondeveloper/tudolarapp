# Proposal

## Why

Currently, the mobile login and registration flows display a municipal market node ("Nodo Activo: Ciudad Ojeda"), conflating global identity with local geographic service scopes. Per architectural principles (AGENTS.md), user identity and authentication are global, and market nodes are independent geographic instances that users select and switch freely. Furthermore, the bottom navigation dock lacks a dedicated "Perfil" destination for users to inspect their account details, verify contact methods, check seller eligibility, switch active nodes, and manage their session.

## What Changes

- **Decouple Market Node from Auth**: Remove municipal market node badges ("Nodo Activo: Ciudad Ojeda") from `/sign-in` and `/register`. Authentication and account creation are presented as global TUDOLAR identity flows.
- **Add "Perfil" Destination to Bottom Dock**: Add a 5th tab `Perfil` (`/profile`) to `BottomDock` (`Ofertas`, `Buscar`, `Publicar`, `Acuerdos`, `Perfil`).
- **Implement Profile Screen (`/profile`)**:
  - Displays user account details: display name, username, email, phone number, and verification badges.
  - Displays seller eligibility and onboarding status.
  - Displays active market node selector with ability to switch geographic scope freely.
  - Provides session logout action for authenticated users.
  - For guest users, provides a welcoming profile prompt to sign in or register.

### Out of Scope
- Backend migration or database changes (uses existing `/users/me`, `/sellers/me/eligibility`, and `/auth/sessions/logout` endpoints).
- Native WebAuthn passkey registration (deferred to T16).

## Capabilities

### Modified Capabilities
- `mobile/stitch-marketplace-ui`: Decouples auth screens from municipal node context, extends `BottomDock` to include the `Perfil` destination, and adds the `/profile` account management screen.

## Impact

- Affected files: `apps/mobile/src/features/auth/sign-in-form.tsx`, `apps/mobile/src/features/auth/register-form.tsx`, `apps/mobile/src/features/marketplace/components/bottom-dock.tsx`, `apps/mobile/src/app/profile.tsx`.
- Source task: Notion T15 / User UX Feedback (Global Identity & User Profile).
