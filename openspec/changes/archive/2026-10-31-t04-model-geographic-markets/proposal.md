# Proposal

## Why

TUDOLAR defines a market not as an arbitrary city-name string, but as a geographic service scope backed by an authoritative boundary polygon in PostGIS (`AGENTS.md`, "Product context"). Searches and offers must be anchored to a validated market. Currently, PostGIS is enabled in the database, but no persistent `markets` table exists, `MarketRepositoryPort` is only a stub with no database adapter, and the pilot market for Ciudad Ojeda has not been modeled or seeded.

Now that the data persistence foundation (T03) and the Stitch UI baseline (T15) are complete, modeling geographic markets is required to unblock market-aware authorization (T05) and offer creation and spatial search (T09/T10).

## What Changes

- Introduce the persistent `markets` table in Prisma (`apps/api/prisma/schema.prisma`) using `Unsupported("geometry(Polygon, 4326)")` as the first spatial model in the system.
- Create a Prisma migration with a GiST spatial index (`USING GIST (boundary)`) on the market polygon for boundary queries.
- Extend `MarketRepositoryPort` in `apps/api/src/markets/application/markets.ports.ts` to support querying markets, checking existence, fetching polygon boundaries, and testing coordinate containment using `ST_Covers`.
- Implement `PrismaMarketRepository` in `apps/api/src/markets/adapters/out/persistence/prisma-market.repository.ts` implementing `MarketRepositoryPort` and `MarketContextPort` with parameterized PostGIS queries.
- Model and seed the pilot market for **Ciudad Ojeda** (Municipio Lagunillas, Zulia) with its authoritative bounding polygon and required OpenStreetMap attribution (`docs/spikes/SYNTHESIS.md:151-153`).
- Add integration tests and migration-safety verification for the spatial table and repository.

### Out of Scope
- Expanding to additional pilot markets (Cabimas, Maracaibo are deferred per ADR-0017 / backlog).
- End-user market switching or offer creation/search (owned by T05 and T09/T10).
- User profile localization or market-specific subscription billing (deferred product decision).

## Capabilities

### New Capabilities
- `markets/geographic-scope`: Persistent modeling of geographic markets with authoritative boundary polygons, PostGIS spatial indexing, point-in-polygon containment verification via `ST_Covers`, and seed data for the Ciudad Ojeda pilot market.

### Modified Capabilities
<!-- None: no existing spec requirements are modified. -->

## Impact

- **Affected Modules:**
  - `apps/api/prisma/schema.prisma` & migrations: Adds `markets` table and GiST index.
  - `apps/api/src/markets/`: Domain models, application ports (`MarketRepositoryPort`), and persistence adapter (`PrismaMarketRepository`).
  - `apps/api/src/database/`: Spatial utilities if needed.
- **Notion Source Task:** Task T04 — *Model geographic markets and prepare Ciudad Ojeda*.
- **Breaking Changes:** None. The change introduces new persistence models and port implementations without breaking existing contracts.
