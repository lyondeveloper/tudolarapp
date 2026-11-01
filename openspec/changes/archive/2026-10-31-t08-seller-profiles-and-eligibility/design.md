# Design

## Context

See `proposal.md` for background. Selling is an earned state, not an account type (ADR-0016), and the offer publish gate composes `SellerEligibilityPort` from `sellers` and `EntitlementPort` from `subscriptions` (ADR-0006). `subscriptions` already provides the `TemporaryEntitlementAdapter` (ADR-0014). This change completes the persistence, use cases, and HTTP adapters for `sellers`.

## Goals / Non-Goals

**Goals:**
- Add `seller_eligibilities` table with foreign key to `users` and database-level `CHECK` constraint on valid states.
- Implement `PrismaSellerRepository` implementing `SellerEligibilityPort`.
- Provide `SellerService` use case enforcing onboarding invariants (email verification required).
- Expose `GET /sellers/me/eligibility`, `POST /sellers/onboard`, and public `GET /sellers/:id/profile`.
- Expose `useSellerEligibilityQuery` and `useOnboardSellerMutation` on the mobile RTK Query API slice.

**Non-Goals:**
- Government ID/KYC document upload (excluded by ADR-0013 and SP07).
- Real billing gateways or webhooks (MVP uses `TemporaryEntitlementAdapter`).

## Decisions

- **Decision: Model seller eligibility in a dedicated table `seller_eligibilities`**:
  - `user_id` as primary key referencing `users(id) ON DELETE CASCADE`.
  - `state` enum column with `CHECK (state IN ('none', 'contact_verified', 'eligible', 'suspended', 'rejected'))`.
  - *Alternatives considered*: Storing on `users` table directly. Rejected by ADR-0016: Selling is a state separate from user identity, and keeping it decoupled allows independent evolution and zero schema contamination of global identity.
- **Decision: Default un-onboarded sellers to `none`**:
  - When querying eligibility for a user with no row in `seller_eligibilities`, the repository returns `{ sellerId, state: 'none' }` instead of throwing an error or creating speculative rows.
- **Decision: Strict public profile privacy**:
  - `GET /sellers/:id/profile` returns only `{ id, displayName, state, memberSince }`. It completely omits email, phone number, credentials, and session data (SP07 Option A1).

## Risks / Trade-offs

- [Risk] Database schema drift with Prisma and hand-written `CHECK` constraints. → Mitigation: Add `CHECK (state IN (...))` in migration SQL and register in `migration-reproducibility.cjs` check list.

## Migration Plan

- Migration `20261031230000_create_seller_eligibilities_table` creates table `seller_eligibilities` with foreign key and check constraint.
- Rollback: `DROP TABLE "seller_eligibilities" CASCADE;`.
