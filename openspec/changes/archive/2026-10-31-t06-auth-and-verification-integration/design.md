# Design

## Context

See `proposal.md` for background. The API already implements password registration (`POST /auth/password/register`), phone verification challenge initiation (`POST /users/me/phone-verification/challenges`), and verification execution (`POST /users/me/phone-verification/verify`), backed by Argon2 password hashing and PostgreSQL identity storage. The mobile client already possesses `useSignInForm` connected to the live API, but `useRegisterForm` remains in local preview mode.

## Goals / Non-Goals

**Goals:**
- Wire mobile `useRegisterForm` to `registerWithPassword` mutation from RTK Query.
- Expand RTK Query `api` slice with phone verification endpoints (`requestPhoneVerification`, `verifyPhone`).
- Present clear success confirmation and guidance upon registration without premature session assumption.
- Provide full test coverage (unit test for hook/form and integration).

**Non-Goals:**
- Third-party production SMS/Email gateway contracts (e.g. Twilio/SendGrid integration; in-memory/test mocks exist on the backend).
- Native OS WebAuthn passkey ceremony (deferred to T16).

## Decisions

- **Decision: Keep registration unauthenticated and asynchronous**: The API responds with `202 Accepted` to `POST /auth/password/register` to avoid leaking account existence and requires email verification. The mobile client shall not attempt to auto-login immediately; instead, it renders a success confirmation prompting the user to check their email and proceed to sign-in.
  - *Alternatives considered*: Auto-logging in the user upon registration. Rejected because email verification is part of the approved MVP trust and safety model (ADR-0010).
- **Decision: Standardize RTK Query endpoints**: Add `requestPhoneVerification` and `verifyPhone` mutations to `api` in `apps/mobile/src/services/api.ts`.
  - *Alternatives considered*: Dedicated Axios or fetch client. Rejected by architectural rule: RTK Query is the single server-state cache in this app.

## Risks / Trade-offs

- [Risk] Duplicate username or email error handling. → Mitigation: Map API error responses into React Hook Form error states cleanly without exposing unhandled exceptions.
