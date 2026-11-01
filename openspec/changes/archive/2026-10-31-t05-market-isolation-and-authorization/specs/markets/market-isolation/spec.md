# Spec Delta

## Purpose

Enforces market scope on marketplace operations via the `X-Market-Id` header, preserves cross-market data isolation, and injects market context into client requests.

## ADDED Requirements

### Requirement: Market-scoped route enforcement via X-Market-Id
The API SHALL require the `X-Market-Id` header on all market-scoped routes, validate the market identifier against active markets, attach the validated market to the request context, and reject missing or blank headers with `400` error code `MARKET_ID_REQUIRED` and unknown or inactive markets with `400` error code `MARKET_NOT_FOUND`.

#### Scenario: Valid market header attaches market context
- **WHEN** a client sends a request to a market-scoped endpoint with a valid active `X-Market-Id` header
- **THEN** the API attaches the market identifier to the request context and processes the request

#### Scenario: Missing market header is rejected
- **WHEN** a client sends a request to a market-scoped endpoint without an `X-Market-Id` header
- **THEN** the API rejects the request with status 400 and code `MARKET_ID_REQUIRED`

#### Scenario: Inactive or unknown market header is rejected
- **WHEN** a client sends a request to a market-scoped endpoint with an invalid, inactive, or unknown market id
- **THEN** the API rejects the request with status 400 and code `MARKET_NOT_FOUND`

### Requirement: Market isolation between distinct markets
The API SHALL isolate data across geographic markets such that an operation requested under market scope A SHALL never access, modify, or return entities belonging to market scope B, and SHALL reject cross-market access attempts with error code `MARKET_MISMATCH`.

#### Scenario: Cross-market entity access is rejected
- **WHEN** a client makes an operation under market scope A referencing an entity belonging to market scope B
- **THEN** the API rejects the operation with error code `MARKET_MISMATCH` and performs no state change

### Requirement: Decoupling of market scope from authentication and authorization
The API SHALL treat identity and authentication as global concerns while requiring explicit authorization and market validation independently on each operation.

#### Scenario: Supplying a valid market does not bypass authentication
- **WHEN** an unauthenticated request with a valid `X-Market-Id` targets a protected endpoint
- **THEN** the API rejects the request with status 401 and does not execute the protected handler

#### Scenario: Authenticated identity does not bypass market scoping
- **WHEN** an authenticated user targets a market-scoped endpoint without an `X-Market-Id` header
- **THEN** the API rejects the request with status 400 and code `MARKET_ID_REQUIRED`

### Requirement: Client-side market context injection
The mobile client SHALL maintain an active selected market in client state and SHALL inject the `X-Market-Id` header on outgoing API requests through RTK Query.

#### Scenario: RTK Query attaches active market header
- **WHEN** the mobile client sends an HTTP request via the RTK Query API client
- **THEN** the request carries the `X-Market-Id` header populated with the active market identifier from client state
