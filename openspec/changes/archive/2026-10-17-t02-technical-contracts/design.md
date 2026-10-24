# Design

## Context

See proposal.md — Why. The authority for every decision below is `docs/adr/0001`–`0018` and
`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md`; this design freezes contracts, it does not re-decide
anything. The existing hexagonal shape to follow is `apps/api/src/auth/`.

The constraint that shapes the whole change: several modules (T08 subscriptions, T09 offers, T13
exchanges) must be able to proceed **in parallel**. That is only possible if the contracts between them
are frozen here, and if each contract has exactly one owning module.

## Goals / Non-Goals

**Goals:**

- One error shape, one pagination convention, one way for the active market to travel, so no module
  invents its own.
- One owner and one field list for the quote and immutable terms-version contract, which currently has
  four names and no owner.
- A single migration authority that is actually true, including PostGIS.
- Module boundaries explicit enough that parallel work does not collide.

**Non-Goals:**

- Implementing any feature behavior. T08–T14 build on these contracts.
- Deciding group **I** (pilot) or group **G** (legal review).
- Reopening the stack.

## Decisions

### The stack, as ADRs 0019–0025

Each records the decision and its rationale, citing `AGENTS.md` rather than restating it as a new rule:

| ADR | Decision |
| --- | --- |
| 0019 | Prisma ORM and Prisma Migrate are the sole schema and migration authority |
| 0020 | Hexagonal architecture in the NestJS API, with the layer names and dependency direction |
| 0021 | RTK Query is the sole remote-state layer; Redux Toolkit owns client state only |
| 0022 | gluestack is the design system, consumed through the token layer |
| 0023 | PostGIS through Prisma, with the `Unsupported("geometry")` mapping and raw SQL confined to `adapters/out/` |
| 0024 | React Native + Expo is the mobile client, with its own test conventions |
| 0025 | The API module boundaries and which module owns each contract |

### The migration authority becomes true

Today `AGENTS.md` claims Prisma owns the schema and migrations, but `CREATE EXTENSION postgis` lives in
`docker/initdb/01-create-databases.sql` and the E2E provisioning script, and the `schema.prisma` header
wrongly says it is appended to the migration. Two consequences: a database created without the init
script silently has no PostGIS, and the next `migrate dev` cannot add it.

- A **`--create-only` migration** adds `CREATE EXTENSION IF NOT EXISTS postgis`, run under a privileged
  migration role. This is the same class of unmodelled object as the existing hand-written CHECK
  constraints, and it is verified against `pg_extension`.
- A **startup assertion** fails loudly when the extension is absent, so a missing extension surfaces as
  a clear startup error rather than a confusing query failure later.
- `docker/initdb` stays as a local convenience; the migration is the authority. The corrected
  `schema.prisma` header already states this.

### The API contract

- **Versioning:** URI prefix `/v1`. The mobile base URL gains it in the same change.
- **One error envelope**, replacing the two shapes that exist today:
  `{ "error": { "code": "...", "message": "...", "details": [...] }, "requestId": "..." }`.
  `code` is a **closed enum** so clients can branch on it; `message` is human-readable and never leaks
  SQL, stack traces, or personal data. `ValidationPipe` failures map into it rather than answering in
  Nest's own shape.
- **Pagination:** cursor-based, `?limit&cursor`, answering `{ "items": [...], "nextCursor": null }`.
  Page size is capped and ordering is stable. Cursors are opaque to the client.
- **Market context:** a required `X-Market-Id` header on every market-scoped endpoint. The server
  validates it on every operation, because `AGENTS.md` makes market scope mandatory and market
  selection is **not** authorization. A missing or unknown market is a `400` with a code, never a
  silent default to "all markets".

### Catalog and money value objects

One pure domain module owns the vocabulary, so no other module re-declares it:

- **Assets:** `VES`, `USD`, `USDT`. **Rails:** `VES_CASH`, `VES_BANK_TRANSFER`, `USD_CASH`,
  `USDT_TRANSFER`. **Pairs** (ADR-0009): `VES_USDT`, `VES_BANK_TO_VES_CASH`, `VES_USD_CASH`,
  `USDT_VES`, `USDT_USD_CASH`. A pair is an ordered `(give, receive)` of legs, and the API exposes the
  **closed pair id** while the two axes stay internal.
- **Money** is an exact decimal plus its asset, never a float. Rounding happens **once**, server-side,
  to the receive asset's minor unit (VES and USD 2 decimals, USDT 6) per ADR-0010.

### The quote and immutable terms-version contract

The addition the product owner assigned here, and the piece with four names and no owner. One shape:

- **`offer_terms_versions` is the source of truth** (ADR-0001), owned by the offers module. Immutable
  and insert-only: `id`, `offerId`, monotonic `version`, `pairId`, `giveAmount`, `receiveAmount`,
  `rate`, `marginPct`, `minAmount`, `maxAmount`, `expiresAt`, `createdAt`.
- **The offer points at its current version.** A material edit **inserts version N+1** and moves the
  pointer; it never updates a version row. Non-material edits (description, details) update the offer
  in place.
- **A quote is the seller's stated terms, frozen for a buyer:** `id`, `offerId`, `termsVersionId`,
  `buyerId`, `validUntil` (**15 minutes**, ADR-0010), `createdAt`. There is **no reference rate and no
  reference as-of time** (ADR-0008), so the quote carries none.
- **An agreement references a `termsVersionId`**, not a copy. A denormalized snapshot is allowed as an
  optimization but is never the source.
- **Immutability is enforced by the database**, not only by application discipline: version rows are
  insert-only, enforced with a privilege or trigger written as hand-written SQL in a `--create-only`
  migration and verified against `pg_trigger`, the same class of object as the existing CHECKs.

This is what makes "an edit cannot silently change terms both parties confirmed" a database invariant
rather than a convention.

### Module boundaries and ownership

| Module | Owns | Consumes |
| --- | --- | --- |
| `catalog` | assets, rails, pairs, money | nothing — pure domain |
| `common` | error envelope, pagination, versioning, market-context guard | `catalog` |
| `markets` | the market, its polygon, and the market predicate | `catalog`, `common` |
| `sellers` | `SellerEligibility` (a **state**, never an account type — ADR-0016) | `common` |
| `subscriptions` | the entitlement **port** only (ADR-0014) | `common` |
| `offers` | offers, terms versions, quotes, inventory counters | `catalog`, `markets`, `sellers`, `subscriptions` |
| `search` | `SearchCriteria` and the query | `catalog`, `markets`, `offers` |
| `conversations` | conversations and messages | `offers` |
| `exchanges` | agreements, incidents, the state machine | `offers`, `conversations` |
| `reports` | reports, blocks, moderation | `sellers` |

The publish gate is composed **in the offers use case** from two ports — seller eligibility and
entitlement — per ADR-0006, so neither `sellers` nor `subscriptions` needs to know the other exists.

### Safe PostGIS queries

Parameterized values only, never interpolated; an explicit allowlist for anything that cannot be
parameterized (identifiers, sort options). The **market predicate sits in the same `WHERE` as the
proximity predicate**, so no query can return an out-of-market offer. Proximity uses `ST_DWithin` with
a consistent SRID and a GiST index. Raw SQL stays inside `adapters/out/` behind a port and never reaches
`domain/` or `application/`.

## Risks / Trade-offs

- [Freezing contracts before features can over-constrain them] → every contract here is derived from an
  ADR or a spike's finding, not invented; where a value is genuinely unknown it is a field with an open
  marker rather than a guessed default.
- [A closed error-code enum can be too small] → it starts with the codes the existing auth module
  already implies plus the ones the gates need, and adding a code is additive, not breaking.
- [A required market header could break existing clients] → there is exactly one client and it is in
  this repository; the mobile base URL changes in the same change.
- [The PostGIS migration needs a privileged role, which conflicts with least privilege for the app
  role] → the migration runs under a separate migration role, and the startup assertion means the app
  role only ever *verifies* the extension, never creates it.
- [Parallel modules could still collide on shared value objects] → `catalog` owns them and is the only
  module that may declare a pair, asset, rail, or money type.

## Migration Plan

No runtime behavior changes. The PostGIS migration is additive and idempotent
(`CREATE EXTENSION IF NOT EXISTS`). Rollback is a revert of the commit; the migration can be reverted
before it is applied anywhere but should not be reverted after, so it lands with its startup assertion
in the same change. An explicit `TUDOLAR_TEST_DATABASE_URL` continues to work unchanged.

## Open Questions

- Group **I** (pilot thresholds, supply minimums, the deferral list, and whether an analytics SDK is
  ever added) — the pilot's, not the build's.
- Group **G** (the legal review) — an input from a lawyer, not an engineering decision.
- Whether the version rows are protected by a revoked `UPDATE` privilege or a trigger. Both satisfy the
  requirement; the choice is an implementation detail for the migration, and either is verifiable
  against the catalogue.
