# Tasks

## 1. Domain & Application Ports

- [x] 1.1 Add failing unit test for `Market` domain entity and boundary representation in `apps/api/src/markets/domain/market.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/markets/domain/market.spec.ts`).
- [x] 1.2 Implement `Market` entity and `MarketBoundary` value object in `apps/api/src/markets/domain/market.ts` and verify unit test passes (`npm --prefix apps/api test -- --watchman=false src/markets/domain/market.spec.ts`).
- [x] 1.3 Extend `MarketRepositoryPort` in `apps/api/src/markets/application/markets.ports.ts` with `findAllActive` and `containsPoint`, and add contract unit test in `apps/api/src/markets/application/markets.ports.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/markets/application/markets.ports.spec.ts`).

## 2. Database Schema & Migration

- [x] 2.1 Declare `Market` model with `Unsupported("geometry(Polygon, 4326)")` in `apps/api/prisma/schema.prisma` and generate Prisma client (`npm --prefix apps/api run prisma:generate`).
- [x] 2.2 Create `--create-only` Prisma migration for `markets` table with `CHECK (ST_SRID(boundary) = 4326)`, GiST index `markets_boundary_gist_idx`, and initial seed data for `ciudad-ojeda` polygon with attribution, verified by migration safety scanner (`npm --prefix apps/api test -- --watchman=false test/migration-safety/scan-migration-sql.spec.ts`).
- [x] 2.3 Apply Prisma migration to database (`npx --prefix apps/api prisma migrate deploy`).

## 3. Persistence Adapter Implementation

- [x] 3.1 Write failing integration test for `PrismaMarketRepository` testing `findById`, `findAllActive`, `exists`, and `containsPoint` (covering inside, outside, and edge boundary points) in `apps/api/src/markets/adapters/out/persistence/prisma-market.repository.spec.ts` (`npm --prefix apps/api test -- --watchman=false src/markets/adapters/out/persistence/prisma-market.repository.spec.ts`).
- [x] 3.2 Implement `PrismaMarketRepository` in `apps/api/src/markets/adapters/out/persistence/prisma-market.repository.ts` with parameterized SQL (`ST_Covers`, `ST_AsGeoJSON`) and verify integration test passes (`npm --prefix apps/api test -- --watchman=false src/markets/adapters/out/persistence/prisma-market.repository.spec.ts`).
- [x] 3.3 Wire `PrismaMarketRepository` to `MARKET_REPOSITORY` and `MARKET_CONTEXT_PORT` in `apps/api/src/markets/markets.module.ts` and verify `MarketContextGuard` passes (`npm --prefix apps/api test -- --watchman=false src/common/market-context/market-context.guard.spec.ts`).

## 4. Verification & Quality Gates

- [x] 4.1 Add end-to-end scenario for market retrieval and geographic containment in `apps/api/test/e2e/markets.e2e-spec.ts` and verify it passes (`npm --prefix apps/api run test:e2e`).
- [x] 4.2 Run full API unit and integration test suite (`npm --prefix apps/api test -- --watchman=false`).
- [x] 4.3 Run API build (`npm --prefix apps/api run build`).
- [x] 4.4 Run API linter (`cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts"`).
- [x] 4.5 Run mobile test suite to verify zero monorepo regressions (`npm --prefix apps/mobile test -- --watchman=false --maxWorkers=2`).
