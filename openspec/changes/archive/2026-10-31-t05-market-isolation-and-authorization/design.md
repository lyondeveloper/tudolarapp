# Design

## Context

See `proposal.md` for motivation. T04 established the persistent `markets` table in PostgreSQL and PostGIS, seeded `ciudad-ojeda`, and provided `PrismaMarketRepository` satisfying `MarketContextPort`. `MarketContextGuard` exists in `apps/api/src/common/market-context/market-context.guard.ts` but needs standardized cross-market matching rules (`MARKET_MISMATCH`), and the mobile client (`apps/mobile/src/services/api.ts`) does not yet attach `X-Market-Id` to outgoing requests.

## Goals / Non-Goals

**Goals:**
- Enforce that market-scoped routes validate `X-Market-Id` on every call, attaching `req.marketId`.
- Add cross-market isolation assertion (`assertMarketMatch`) and `MARKET_MISMATCH` error code in `ApiErrorCode`.
- Verify that market scoping and authentication are independent: authentication does not waive market scoping, and market selection does not waive authentication.
- Create a client-side Redux `marketSlice` in `apps/mobile/src/features/marketplace/market-slice.ts` with `'ciudad-ojeda'` as the active pilot market.
- Configure mobile RTK Query `prepareHeaders` in `apps/mobile/src/services/api.ts` to automatically inject `X-Market-Id` from state into all API calls.
- Add E2E and unit test coverage verifying cross-market isolation and header injection.

**Non-Goals:**
- UI for multi-market selector dialogs (MVP remains focused on Ciudad Ojeda).
- Offers search and publishing business logic (owned by T09/T10).

## Hexagonal Layer Mapping

| Layer | File / Path | Responsibility |
|---|---|---|
| **API Common** | `apps/api/src/common/errors/api-error-code.ts` | Closed enum of error codes: adds `MARKET_MISMATCH = 'MARKET_MISMATCH'`. |
| **API Inbound Adapter** | `apps/api/src/common/market-context/market-context.guard.ts` | Guard checking `X-Market-Id` header against `MarketContextPort.exists()` and attaching `req.marketId`. |
| **API Domain / App** | `apps/api/src/common/market-context/market-isolation.ts` | Pure invariant helper `assertMarketMatch(requestedMarketId, entityMarketId)` that throws `ApplicationError(ApiErrorCode.MARKET_MISMATCH)`. |
| **Mobile Client State** | `apps/mobile/src/features/marketplace/market-slice.ts` | Redux client state slice managing `activeMarketId`. |
| **Mobile Service Adapter** | `apps/mobile/src/services/api.ts` | RTK Query `prepareHeaders` injecting `X-Market-Id` and `Authorization`. |

## Decisions

### 1. Header Name: `X-Market-Id`
- **Rationale:** Established in ADR-0002, ADR-0020, and `AGENTS.md`. Case-insensitive in HTTP, standard in `market-context.guard.ts`.
- **Alternatives considered:** Path parameter `/markets/:marketId/...` (rejected: makes authentication and global routes awkward, complicates base URLs).

### 2. Isolation Assertion: `assertMarketMatch`
- **Rationale:** Keeping the cross-market check in a small, reusable domain helper ensures any future use case (offers, chat, agreements) can verify that an entity belongs to the active market without repeating conditional logic or error codes.
- **Alternatives considered:** Duplicating `if (entity.marketId !== req.marketId)` across controllers (rejected: violates DRY and hexagonal separation).

### 3. Redux Market State in Mobile Client
- **Rationale:** Market selection is client-side state (Redux Toolkit), while server-side data belongs in RTK Query (`AGENTS.md`, "React"). RTK Query reads from Redux store in `prepareHeaders` via `getState()`.
- **Alternatives considered:** Storing marketId in local component state (rejected: headers must be applied uniformly across all queries).

## Database Migration & Rollback

No database schema migrations are required for T05. The `markets` table, PostGIS indexes, and seed data from T04 (`20261031200000_create_markets_table`) are already deployed and active.

## Risks / Trade-offs

- **[Risk]** Unauthenticated endpoints might accidentally be decorated with `@MarketScoped()` or vice-versa.
  → **Mitigation:** Comprehensive E2E tests verify that public endpoints (health, sign-in) remain accessible without `X-Market-Id`, while market endpoints strictly reject requests missing the header.
