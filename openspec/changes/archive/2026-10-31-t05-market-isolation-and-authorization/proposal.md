# Proposal

## Why

In TUDOLAR, identity and authentication are global, but marketplace operations (offers, searches, conversations, exchanges) are strictly scoped to a selected geographic market (`AGENTS.md`, "Product context"). Selecting a market is never authorization: the server must validate market scope on every operation and isolate entities between markets so that requests in market A cannot access or alter entities in market B.

While T04 established the persistent `markets` table in PostGIS and the `ciudad-ojeda` seed data, the system currently lacks:
1. End-to-end enforcement and cross-market isolation guards across resources.
2. Injection of the `X-Market-Id` header from the mobile RTK Query client.
3. Explicit validation that cross-market operations fail fast with coded errors.

Completing T05 establishes the isolation layer necessary before exposing seller profiles (T07/T08), offer creation (T09), and search (T10).

## What Changes

- **API Guard & Cross-Market Isolation:**
  - Standardize `@MarketScoped()` guard enforcement on all market operations via `X-Market-Id`.
  - Introduce cross-market boundary validation: reject any operation where the entity's market does not match the active `X-Market-Id` with a coded `403/400` error (`MARKET_MISMATCH`).
  - Ensure health checks and global identity operations (sign-in, registration, password recovery) remain market-free.
  - Assert that market selection is decoupled from authorization: authenticating a user does not grant access to operations without a valid market, and supplying a valid market does not bypass authentication or authorization.

- **Mobile RTK Query Integration:**
  - Create a Redux client-state market slice (`src/features/marketplace/market-slice.ts`) managing the active market (defaulting to `'ciudad-ojeda'` for the MVP pilot).
  - Update RTK Query `prepareHeaders` in `src/services/api.ts` to automatically attach the `X-Market-Id` header from the Redux store.
  - Wire the mobile `MarketNodeBanner` to the active market state.

### Out of Scope
- Dynamic user market-switching UI with multi-city navigation (Cabimas/Maracaibo deferred per ADR-0017).
- Offer persistence and search query execution (owned by T09/T10).
- Seller profile management and subscription billing (owned by T07/T08).

## Capabilities

### New Capabilities
- `markets/market-isolation`: Cross-cutting market context enforcement via `X-Market-Id`, cross-market data isolation invariants, separation of market scope from authentication/authorization, and client-side header injection in RTK Query.

### Modified Capabilities
<!-- None: no existing spec requirements are modified. -->

## Impact

- **Affected Modules:**
  - `apps/api/src/common/market-context/`: Guard and isolation contracts.
  - `apps/api/src/markets/`: Market context resolution and domain error codes.
  - `apps/mobile/src/services/api.ts`: RTK Query `prepareHeaders`.
  - `apps/mobile/src/features/marketplace/`: Redux market slice and banner integration.
- **Notion Source Task:** Task T05 — *Market isolation and authorization*.
- **Breaking Changes:** None. Market-free endpoints (health, auth) remain unaffected. Market-scoped routes enforce the existing `X-Market-Id` contract.
