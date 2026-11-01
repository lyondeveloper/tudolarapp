# Design

## Context

See proposal.md - Why.
Offers are stored with PostGIS Point geometry in SRID 4326 and indexed with GiST (`offers_location_gist_idx`). Proximity search requires calculating geodesic distances over `geography` within a bounded radius (default 5 km, capped at 50 km) while preserving strict market isolation (`X-Market-Id`).

## Goals / Non-Goals

**Goals:**
- Provide deterministic proximity search over active offers in Ciudad Ojeda using PostGIS `ST_DWithin` and `ST_Distance`.
- Order results deterministically by ascending distance with offer UUID as a stable tie-breaker.
- Paginate results using opaque cursor pagination adhering to the shared `CursorPage` contract.
- Keep SQL strictly parameterized through the spatial query layer and safe allowlists.
- Expose `GET /search/offers` protected by `@MarketScoped()` and connect to the mobile client.

**Non-Goals:**
- Natural-language LLM parsing (deferred per ADR-0015; parser port remains an unimplemented contract).
- Multi-market federated search (markets are strictly isolated geographic silos).

## Decisions

- **Decision: Distance calculation and filtering over PostGIS geography**
  - *Rationale*: Using `o.location::geography` and `ST_DWithin(..., radius_meters)` provides accurate real-world meter distances and leverages the GiST index on `offers.location`.
  - *Alternatives considered*: Euclidean degrees calculation on geometry. Rejected because degree distance is inaccurate for geographic meters and violates ADR-0017 and spatial-queries specs.

- **Decision: Stable cursor pagination based on distance and ID**
  - *Rationale*: Cursor encodes `(distanceMeters, offerId)` to allow deterministic pagination across pages even as real-time queries occur.
  - *Alternatives considered*: Offset/limit pagination. Rejected due to N+1 drift and performance degradation on large datasets.

- **Decision: Allowlist registration for offers table**
  - *Rationale*: In accordance with `database/spatial-queries` spec, `{ table: 'offers', geographyColumn: 'location' }` is registered in `PRODUCTION_SPATIAL_ALLOWLIST` to prevent untrusted column identifiers.

## Risks / Trade-offs

- **[Risk] PostGIS geography casting overhead on large result sets** → *Mitigation*: GiST index on `location` and `ST_DWithin` bounding filter eliminates non-matching rows before `ST_Distance` is computed.
- **[Risk] Cursor format tampering** → *Mitigation*: Base64 opaque cursor validation fails closed and rejects invalid tokens cleanly with standard 400 Bad Request.

## Migration Plan

No database schema migrations needed (table `offers` and GiST index `offers_location_gist_idx` were applied in T09).
Rollback strategy: git revert on search module code.
