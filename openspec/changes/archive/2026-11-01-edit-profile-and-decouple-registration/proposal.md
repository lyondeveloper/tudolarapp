# Proposal: Edit Profile Capability and Complete Registration Decoupling

## Why

In the user's recent feedback across multiple messages:
1. Registration (`/register`) still had a "Sector Frecuente en Ciudad Ojeda" selector, which unnecessarily binds account creation to a municipal node when user identity is global.
2. The profile screen (`/profile`) allowed inspecting user account details, but did not allow modifying them ("un perfil para ver el usuario y modificar").

## What Changes

- **Decouple Registration from Municipal Node**: Remove `Sector Frecuente en Ciudad Ojeda` and `frequentSector` from `RegisterForm` and `useRegisterForm`. Registration collects only global account credentials and civic pact acceptance.
- **Enable Profile Modification (`/profile`)**: Add an "Editar Perfil" action and modal allowing the user to edit their display name and contact phone number.
- **Client API & Store**: Wire profile modifications with optimistic updates or mutation on `api.ts` invalidating `CurrentUser`.
- **Test Coverage**: Update `register-form.spec.tsx`, `register-screen.spec.tsx`, and `profile-screen.spec.tsx` to assert node-free registration and profile modification.

## Capabilities

### Modified Capabilities
- `mobile/stitch-marketplace-ui`: Decouple registration from municipal corridors, and allow modifying profile attributes (display name and phone) on `/profile`.

## Impact

- Affected files in `apps/mobile/src/features/auth/` and `apps/mobile/src/app/`.
- Zero database migrations required.
