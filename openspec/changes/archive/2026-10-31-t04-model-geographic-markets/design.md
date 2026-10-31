# Design

## Context

See `proposal.md` for motivation. Currently, `apps/api/src/markets/domain/market.ts` defines an in-memory `Market` interface with only `id` and `name`. `MarketRepositoryPort` in `apps/api/src/markets/application/markets.ports.ts` only declares `findById` and has no persistent implementation. Meanwhile, PostGIS extension is installed (`20261017190000_add_postgis_extension`), but no spatial tables exist in `apps/api/prisma/schema.prisma`.

ADR-0023 and `AGENTS.md` establish that spatial columns use `Unsupported("geometry")` (or `Unsupported("geometry(Polygon, 4326)")`), consistent SRID 4326, parameterized raw SQL in `adapters/out/` behind a port, and GiST indexes.

## Goals / Non-Goals

**Goals:**
- Define the `Market` model in `schema.prisma` with `Unsupported("geometry(Polygon, 4326)")` and create a Prisma migration with a GiST spatial index.
- Separate responsibilities cleanly across hexagonal layers:
  - `domain/`: Rich `Market` domain entity with geographic attributes (`boundary` GeoJSON / coordinates, `isActive`, `attribution`).
  - `application/`: `MarketRepositoryPort` exposing `findById`, `findAllActive`, and `containsPoint`.
  - `adapters/out/`: `PrismaMarketRepository` implementing `MarketRepositoryPort` and `MarketContextPort` with parameterized SQL for PostGIS operations.
- Provide seed data for the `ciudad-ojeda` market polygon with required OpenStreetMap attribution.
- Maintain 100% test coverage with unit tests for domain/application and integration tests for the Prisma repository against real PostGIS.

**Non-Goals:**
- Creating HTTP endpoints for administrative polygon drafting or market CRUD (markets are operator-provisioned data for MVP).
- Filtering offers or search queries (owned by T09/T10).

## Hexagonal Layer Mapping

| Layer | File / Path | Responsibility |
|---|---|---|
| **Domain** | `apps/api/src/markets/domain/market.ts` | Pure domain model: `Market` interface, `MarketBoundary` value object, and domain invariants. Free from ORM/NestJS imports. |
| **Domain** | `apps/api/src/markets/domain/market-predicate.ts` | Allowlisted identifiers and spatial predicate construction. |
| **Application (Port)** | `apps/api/src/markets/application/markets.ports.ts` | `MarketRepositoryPort` interface (token `MARKET_REPOSITORY`), extending `MarketContextPort`. |
| **Outbound Adapter** | `apps/api/src/markets/adapters/out/persistence/prisma-market.repository.ts` | Concrete repository implementing `MarketRepositoryPort` and `MarketContextPort` using Prisma and parameterized `$queryRaw` for `ST_Covers`, `ST_AsGeoJSON`, and GiST spatial index usage. |
| **Composition** | `apps/api/src/markets/markets.module.ts` | Binds `MARKET_REPOSITORY` and `MARKET_CONTEXT_PORT` to `PrismaMarketRepository`. |
| **Persistence** | `apps/api/prisma/schema.prisma` | Declares `Market` model with `Unsupported("geometry(Polygon, 4326)")`. |

## Decisions

### 1. Spatial representation: `geometry(Polygon, 4326)` in WGS84
- **Rationale:** Consistent with ADR-0023 and SP05. Coordinate inputs from GPS and GeoJSON are in WGS84 (SRID 4326). Using `geometry(Polygon, 4326)` allows planar polygon representation and fast `ST_Covers` containment checks.
- **Alternatives considered:**
  - `geography(Polygon, 4326)`: Spherical polygons add compute overhead on containment checks without adding value for city-scale polygons.
  - Plain string / bounding box: Rejected because convex bounding boxes do not accurately represent real municipal or service boundaries.

### 2. Point-in-polygon predicate: `ST_Covers`
- **Rationale:** Per SP05 and PostGIS documentation, `ST_Covers` is boundary-inclusive (a point exactly on the polygon edge is considered covered/inside). In contrast, `ST_Contains` rejects coordinates on the boundary.
- **Alternatives considered:** `ST_Contains` (rejected due to boundary exclusion).

### 3. Outbound adapter raw SQL boundary
- **Rationale:** Because Prisma does not natively support geometry types in query builders, spatial reads (`ST_AsGeoJSON(boundary)`) and spatial tests (`ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))`) must run via `$queryRaw`. Per hexagonal architecture, raw SQL is confined to `adapters/out/persistence/prisma-market.repository.ts` and never leaks to `application/` or `domain/`.
- **Alternatives considered:** Querying coordinates in application memory (rejected because PostGIS spatial index provides sub-millisecond evaluation in the DB).

## Database Migration & Rollback

### Migration
- **File:** `apps/api/prisma/migrations/20261031200000_create_markets_table/migration.sql`
- **Actions:**
  - Create table `markets` with `id VARCHAR(64) PRIMARY KEY`, `name VARCHAR(128) NOT NULL`, `description TEXT`, `boundary geometry(Polygon, 4326) NOT NULL`, `is_active BOOLEAN NOT NULL DEFAULT true`, `attribution TEXT`, `created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP`.
  - Add constraint `CHECK (ST_SRID(boundary) = 4326)`.
  - Add GiST spatial index: `CREATE INDEX markets_boundary_gist_idx ON markets USING GIST (boundary);`.
  - Insert seed data for `ciudad-ojeda` polygon with attribution `"© OpenStreetMap contributors"`.

### Rollback Strategy
- Hand-crafted down migration:
  ```sql
  DROP INDEX IF EXISTS markets_boundary_gist_idx;
  DROP TABLE IF EXISTS markets;
  ```

## Risks / Trade-offs

- **[Risk]** Complex polygon vertices may slow down `ST_Covers` checks.
  → **Mitigation:** The Ciudad Ojeda polygon boundary is simplified to reasonable municipal resolution (< 100 vertices), and the GiST bounding box index eliminates checks for any point outside the bounding box.
- **[Risk]** Prisma `migrate dev` might detect drift if hand-written constraints are altered.
  → **Mitigation:** Migration is created with `--create-only` and verified against `scan-migration-sql.spec.ts`.
