# Proposal

## Why

Sellers need to publish cash and currency exchange offers in their active geographic market (Ciudad Ojeda) with defined commercial terms, inventory, and physical meeting locations. Publishing an offer requires verifying seller eligibility and active subscription entitlements, validating the meeting coordinates against the market boundary, and persisting the offer atomically with its immutable initial terms version in PostgreSQL.

## What Changes

- Add persistent `offers` table in PostgreSQL through Prisma schema with PostGIS spatial point geometry (`geometry(Point, 4326)`), inventory counters, and strict database `CHECK` constraints.
- Implement `OfferRepositoryPort` and `PrismaOfferRepository` handling atomic offer persistence, spatial location insertion, and terms linking.
- Implement `TermsVersionRepositoryPort` and `PrismaTermsVersionRepository` persisting immutable offer terms versions.
- Implement `PublishOfferUseCase` composing `SellerEligibilityPort` (ADR-0006), `EntitlementPort`, `MarketRepositoryPort` (geographic boundary coverage validation via PostGIS `ST_Covers`), and transactional persistence of offer + version 1 terms.
- Expose `POST /offers` in `OffersController` requiring JWT authentication and `@MarketScoped()` validation.
- Connect mobile client RTK Query `publishOffer` mutation and wire `apps/mobile/src/features/marketplace/use-publish-offer-form.ts` and `apps/mobile/app/publish.tsx`.
- Add end-to-end integration and API tests verifying full offer publication, gate authorization, and market spatial containment.

## Capabilities

### New Capabilities
- `offers/offers-publishing`: End-to-end publishing of market-scoped offers in Ciudad Ojeda, enforcing seller eligibility, active entitlement, geographic boundary containment, inventory bounds, and atomic initial terms versioning.

### Modified Capabilities
<!-- None: existing terms-and-inventory spec requirements remain unchanged and satisfied. -->

## Impact

- Affected backend modules: `apps/api/src/offers/`, `apps/api/src/markets/`, `apps/api/prisma/schema.prisma`.
- Affected mobile files: `apps/mobile/src/services/api.ts`, `apps/mobile/src/features/marketplace/use-publish-offer-form.ts`, `apps/mobile/app/publish.tsx`.
- Database migrations: new migration creating `offers` table with GiST index and `CHECK` constraints.
- E2E tests: new suite `apps/api/test/e2e/offers-publishing.e2e-spec.ts`.
