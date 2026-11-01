# Proposal

## Why

The mobile client currently handles sign-in with real JWT token storage and session restoration, but the user registration flow in `/register` remains in a local preview state without submitting to the backend. In order for users to actually create accounts, verify contact details, and participate in the P2P marketplace, the mobile registration and phone verification flows must be fully integrated with the NestJS API authentication endpoints (`POST /auth/password/register`, `POST /users/me/phone-verification/challenges`, `POST /users/me/phone-verification/verify`).

## What Changes

- Connect mobile `RegisterForm` / `useRegisterForm` to the API's `POST /auth/password/register` endpoint via RTK Query mutation `registerWithPassword`.
- Add phone verification challenge and verification mutations (`requestPhoneVerification`, `verifyPhone`) to the RTK Query API service (`apps/mobile/src/services/api.ts`).
- Handle registration response states in the mobile UI: display success guidance instructing the user to verify their email, and handle coded conflict/validation errors gracefully.
- Provide end-to-end and component tests verifying the complete registration and phone verification lifecycle between mobile and the backend.

## Capabilities

### New Capabilities
- `auth/registration-and-verification`: User registration with username, email, display name, and password, followed by email and phone verification handshakes without custody or escrow.

### Modified Capabilities
None.

## Impact

- **Affected modules**:
  - `apps/mobile/src/services/api.ts`: add phone verification mutations.
  - `apps/mobile/src/features/auth/use-register-form.ts`: integrate `useRegisterForm` with `useRegisterWithPasswordMutation`.
  - `apps/mobile/src/features/auth/register-form.tsx`: render live submission, loading states, and error handling.
  - `apps/mobile/src/features/auth/register-form.spec.tsx` and `apps/mobile/src/__tests__/register-screen.spec.tsx`: update test specs for live integration.
  - `apps/api/test/e2e/auth.e2e-spec.ts`: ensure full regression coverage.
