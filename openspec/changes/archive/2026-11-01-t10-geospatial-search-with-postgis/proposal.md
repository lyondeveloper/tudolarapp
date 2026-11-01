# Proposal

## Why

Buyers and users need to discover active cash and currency exchange offers within their selected geographic market (Ciudad Ojeda) using proximity filters, distance ordering, and specific catalog pairs. Geospatial search must run through PostGIS spatial indexing (`ST_DWithin` and `ST_Distance`) with strict market scope isolation, input allowlisting, bounded search radii, and deterministic cursor pagination.

## What Changes

- Register `{ table: 'offers', geographyColumn: 'location' }` in `PRODUCTION_SPATIAL_ALLOWLIST`.
- Implement `PrismaSearchQueryRepository` implementing `SearchQueryPort` using parameterized PostGIS `ST_DWithin` and `ST_Distance` calculations over `geography`.
- Implement `SearchOffersUseCase` executing deterministic proximity queries with market isolation, catalog pair filtering, amount filtering, and cursor pagination.
- Expose `GET /search/offers` in `SearchController` requiring `@MarketScoped()` validation and validating query parameters.
- Add `searchOffers` query endpoint to mobile client RTK Query in `apps/mobile/src/services/api.ts` and wire with `apps/mobile/src/app/search.tsx`.
- Add end-to-end integration and API tests verifying geospatial proximity filtering, radius bounds, market isolation, and cursor pagination.

## Capabilities

### New Capabilities
- `search/geospatial-search`: Deterministic geospatial discovery of active offers within a geographic market scope using PostGIS proximity filters, bounded search radius, catalog pairs, and cursor pagination.

### Modified Capabilities
<!-- None: existing spatial-queries spec requirements remain satisfied. -->

## Impact

- Affected backend modules: `apps/api/src/search/`, `apps/api/src/database/spatial/`.
- Affected mobile files: `apps/mobile/src/services/api.ts`, `apps/mobile/src/app/search.tsx`.
- E2E tests: new suite `apps/api/test/e2e/geospatial-search.e2e-spec.ts`.
