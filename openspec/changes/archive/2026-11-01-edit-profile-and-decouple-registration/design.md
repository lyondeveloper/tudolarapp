# Design: Edit Profile Capability & Complete Registration Decoupling

## Context

See `proposal.md` for motivation. Per user request:
1. Registration (`/register`) must not depend on or ask for a node/corridor, because identity in TUDOLAR is global.
2. The user profile screen (`/profile`) must support viewing and modifying account details (display name and phone number).

## Goals / Non-Goals

**Goals:**
- Completely remove `frequentSector` / `CIUDAD_OJEDA_CORRIDORS` from `/register` and `useRegisterForm`.
- Add an "Editar Perfil" modal to `/profile` to modify `displayName` and `phoneNumber`.
- Maintain 100% test pass rate across mobile suites.

**Non-Goals:**
- Modifying email or username (which have specialized verification lifecycles).
- Changes to database schema.

## Decisions

### 1. Remove Sector Selection from Registration Form
- *Rationale*: A municipal node is a search/publish context, not an identity constraint. Removing `CIUDAD_OJEDA_CORRIDORS` from `/register` reinforces that account creation is purely global.

### 2. Add Edit Profile Modal in `/profile`
- *Rationale*: Adding a clean edit modal (`profile-edit-button`, `profile-edit-modal`) provides inline editing for `displayName` and `phoneNumber`, updating the user view immediately and comfortably.

## Risks / Trade-offs

- **[Risk] Test failures where `register-sector-...` was clicked** → *Mitigation*: Update `register-form.spec.tsx` and `register-screen.spec.tsx` to assert node independence and absence of sector selection chips.
