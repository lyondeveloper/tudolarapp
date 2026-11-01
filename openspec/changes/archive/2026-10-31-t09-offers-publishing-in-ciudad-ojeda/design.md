# Design

## Context

See proposal.md - Why.
Offers in TUDOLAR require strict geographic scoping to Ciudad Ojeda, seller eligibility and active entitlement verification, PostGIS geometry storage for physical meeting coordinates, and immutable terms versioning.

## Goals / Non-Goals

**Goals:**
- Add the persistent `offers` table in PostgreSQL with PostGIS point geometry (`geometry(Point, 4326)`), GiST spatial index, and database check constraints.
- Implement `PublishOfferUseCase` adhering to Hexagonal Architecture, strictly orchestrating `SellerEligibilityPort`, `EntitlementPort`, and `MarketRepositoryPort`.
- Persist the offer and its version 1 terms atomically inside a single transaction.
- Implement thin `OffersController` with `@MarketScoped()` and JWT authorization.
- Connect the mobile client RTK Query publish flow to the API endpoint.

**Non-Goals:**
- Geospatial search / proximity queries (`ST_DWithin`) across published offers (handled in T10).
- Agreement creation, escrow, or chat coordination (subsequent tasks).
- Real-world payment gateway for seller subscriptions (simulated/mocked entitlement for MVP seller subscription).

## Decisions

- **Decision: PostGIS Point representation in Prisma schema**
  - *Rationale*: Prisma does not have native geometry types. We use `location Unsupported("geometry(Point, 4326)")` in `schema.prisma`, with a GiST index `@@index([location], type: Gist, map: "offers_location_gist_idx")`. In the persistence adapter, we use parameterized SQL (`ST_SetSRID(ST_MakePoint($lon, $lat), 4326)`) within `$queryRaw` / `$executeRaw` or raw inserts in `$transaction`.
  - *Alternatives considered*: Storing raw `latitude` and `longitude` numeric columns. Rejected because PostGIS spatial indexing (`GiST`) and boundary testing (`ST_Covers`) are essential for performance and geographic validation.

- **Decision: Gate composition inside PublishOfferUseCase**
  - *Rationale*: ADR-0006 specifies that gate composition (seller eligibility `state === 'eligible'` + active entitlement `entitled === true`) belongs inside the application use case, keeping controllers thin and business rules centralized.
  - *Alternatives considered*: Controller guards or middleware. Rejected because business domain invariants must not leak into HTTP infrastructure.

- **Decision: Atomic transaction for Offer + OfferTermsVersion**
  - *Rationale*: Version 1 terms must exist as soon as the offer is published, and `current_terms_version_id` must point to it. An incomplete offer without terms or orphaned terms version violates invariant integrity.
  - *Alternatives considered*: Two separate API calls or non-transactional inserts. Rejected due to risk of partial state on database failure.

## Risks / Trade-offs

- **[Risk] PostGIS Unsupported type in Prisma client** → *Mitigation*: The `PrismaOfferRepository` performs point conversions using PostGIS SQL functions (`ST_X(location)`, `ST_Y(location)`) and maps raw database records into pure domain `Offer` entities.
- **[Risk] Unregistered check constraints in migration reproducibility check** → *Mitigation*: Hand-written constraints are added to `apps/api/test/e2e/migration-reproducibility.cjs` in the `EXPECTED_CHECK_CONSTRAINTS` array to guarantee migration safety.

## Migration Plan

1. Update `apps/api/prisma/schema.prisma` with `Offer` model and GiST index.
2. Run `npm --prefix apps/api run db:migrate:dev -- --create-only --name create_offers_table`.
3. Add hand-written SQL `CHECK` constraints to the generated migration SQL file.
4. Execute `npm --prefix apps/api run db:migrate:dev` to apply the migration.
5. Re-generate Prisma client via `npm --prefix apps/api run prisma:generate`.
6. Rollback strategy: standard Prisma migrate down / reset script against dev/test database.
