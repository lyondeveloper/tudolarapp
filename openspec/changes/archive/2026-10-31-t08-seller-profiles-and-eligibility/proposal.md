# Proposal

## Why

In the TUDOLAR P2P marketplace, selling is an earned state, never an account type (ADR-0016). Before a user can publish currency exchange offers in Ciudad Ojeda (T09), the publish gate must verify both seller eligibility and active entitlement (ADR-0006). This change introduces persistent seller eligibility, onboarding, and minimal privacy-preserving public profiles.

## What Changes

- Add `seller_eligibilities` table to PostgreSQL via Prisma migration with a foreign key to `users` and a `CHECK` constraint validating state values (`none`, `contact_verified`, `eligible`, `suspended`, `rejected`).
- Implement `PrismaSellerRepository` adhering to `SellerEligibilityPort` in `apps/api/src/sellers/adapters/out/persistence/`.
- Provide `GET /sellers/me/eligibility` and `POST /sellers/onboard` endpoints in `SellerController` so active users can onboard as sellers.
- Provide `GET /sellers/:id/profile` returning public seller signals (display name, verification badges, eligibility state) without exposing private PII (email, phone, credentials, or sessions).
- Add seller eligibility and onboarding mutations to the mobile client's RTK Query API service (`apps/mobile/src/services/api.ts`).
- Add comprehensive unit, integration, and E2E coverage for seller eligibility and public profile privacy boundaries.

## Capabilities

### New Capabilities
- `sellers/seller-eligibility`: Manages seller publishing eligibility states, onboarding requirements, and public profile privacy boundaries.

### Modified Capabilities
None.

## Impact

- **Affected backend modules**:
  - `apps/api/prisma/schema.prisma` & new migration: `seller_eligibilities`.
  - `apps/api/src/sellers/`: implement repository, controller, and DTOs.
  - `apps/api/src/common/errors/api-error-code.ts`: add seller eligibility error codes if needed (`SELLER_NOT_ELIGIBLE`).
- **Affected mobile modules**:
  - `apps/mobile/src/services/api.ts`: add `sellerEligibility` query and `onboardSeller` mutation.
