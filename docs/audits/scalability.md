# TUDOLAR — scalability audit

Audit of the frozen contracts (T02) and the implemented code against the MVP load the product
implies: one market (Municipio Lagunillas), five currency pairs, and a publish-and-find loop. This
is a review: nothing here was changed, no migration or configuration was touched, and no performance
claim is made that is not either read directly from the code or marked as unverified.

Read first: `AGENTS.md` (indexing, pagination, transaction scope, query-plan rules) and
`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md` (the contracts just frozen).

## Verdict

The first thing that breaks as load grows is the **search / offer-list read path**, and the specific
mechanism is already frozen in the shared pagination contract: `paginate()` in
`apps/api/src/common/pagination/cursor-pagination.ts:46-78` materialises the **entire** result set in
the API process, sorts it in JavaScript, and only then slices a page — so no `LIMIT` reaches SQL, a
client asking for `limit=1` still pays the full `O(n log n)` sort and `O(n)` memory, and the same
helper cannot keep a page stable when an offer is hidden or expires mid-pagination. This is the hot
path the product is built around (publish-and-find), it is the contract T09/T10 will implement
against, and it is amplified by two adjacent gaps: the offer table's indexes and the availability
filter do not exist yet (no `offers` migration), and the connection pool and request path have no
timeout to shed a slow query (`apps/api/src/database/prisma.service.ts:19-25`,
`apps/api/src/main.ts:4-11`). At true MVP scale — one market, hundreds of offers — none of this is
felt; it becomes the wall as the offer set per market grows past a few thousand or as markets are
added. The concurrency guards (inventory CAS, insert-only terms versions, session rotation) are
**correct** and are not the first thing to break; the contention they carry is the intended price of
their invariants.

A caveat that shapes every finding below: **the offers, markets, and search adapters do not exist
yet.** The modules are registered but provide nothing (`offers.module.ts`, `markets.module.ts`,
`search.module.ts`, `conversations.module.ts`, `exchanges.module.ts` are all `@Module({})`), and the
only migrations are the identity schema, the PostGIS extension, and the terms-version table. So most
of this audit is a review of **frozen contracts, the migration/design they imply, and the auth code
that is actually running** — not of a running marketplace.

---

## Findings, ordered by severity

### H1 — Cursor pagination is in-memory and unbounded (area: pagination/payloads)

`apps/api/src/common/pagination/cursor-pagination.ts:46-78`.

- **Failure mode.** `paginate()` takes `items: readonly T[]` — a fully materialised list — and does
  `[...items].sort(options.compare)` (`:52`) over all of it, then `ordered.slice(start, start + limit)`
  (`:67`). The page size is clamped (`resolvePageLimit`, `:33-38`, `MAX_PAGE_SIZE = 100`, `:7`), but
  the *work* is proportional to the total number of matches, not to the page. A client requesting
  `limit=1` on a market with 20 000 offers still triggers a full fetch, a full sort, and a full array
  copy in the API process. The cursor is applied by `findIndex` (`:57`), an `O(n)` scan on top.
- **Load at which it matters.** While a market holds hundreds of offers this is invisible. It bites
  when the market-scoped result set reaches the low thousands, and it is worse the more markets are
  added, because the helper does not know about markets at all.
- **Concrete fix.** Make the cursor a **keyset seek pushed into SQL**: `WHERE (sort_key, id) > ($k, $i)
  ORDER BY sort_key, id LIMIT $limit + 1`, and keep `paginate()` only for pure-domain slices of
  already-bounded data. `SearchQueryPort.search(criteria, page)` already receives the page
  (`search/application/search.ports.ts:26-31`), so the adapter (T10) and the offer-list adapter (T09)
  can push the seek and the `LIMIT` down without changing the contract; what must change is that the
  shared helper is **not** used as the mechanism for a database-backed page. Evidence that this is the
  intended hot path: `docs/flows/search-and-contact.md:13` and `docs/adr/0017-...:28-40` (whole-market
  search when GPS is absent).

### H2 — The cursor is not stable under concurrent writes (area: pagination/payloads)

`apps/api/src/common/pagination/cursor-pagination.ts:55-65`.

- **Failure mode.** The cursor payload is `{ k, i }` — the sort key and id of the last item
  (`cursor.ts:9-14`) — but the next page re-locates that item by **value** with `findIndex`. If the
  anchor item no longer exists, the code throws `ApplicationError(INVALID_CURSOR)` (`:61-63`) and the
  client gets a `400` in the middle of scrolling. The anchor vanishes routinely: SP03 §4.4 hides an
  offer from search the moment `available_amount` reaches zero, and offers expire by time
  (`docs/adr/0010-...:31-32`, 7-day default). An insert before the anchor shifts the window and
  silently skips or repeats rows. This is offset pagination wearing a cursor's clothes.
- **Load at which it matters.** Any market where offers are published, expire, or deplete while a user
  is paging — i.e. the normal case, not an edge case.
- **Concrete fix.** Same keyset seek as H1: the cursor becomes a *position* (`> (k, i)`), so a vanished
  anchor simply yields the next rows instead of a `400`. Keep cursors opaque (`cursor.ts:16-24`) and
  re-validated on input (`:34-38`) — that part is correct.

### H3 — The spatial predicate assumes a `geography` column the frozen mapping does not name (area: spatial path)

`apps/api/src/markets/domain/market-predicate.ts:112-115` against
`apps/api/prisma/schema.prisma:8-12` and `docs/adr/0023-postgis-through-prisma.md:29-31`.

- **Failure mode.** The proximity clause is
  `ST_DWithin(offers.location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)` — the third
  argument is **meters**, which only the `geography` overload of `ST_DWithin` accepts. The builder
  casts the *point* to geography but not `offers.location`, so the predicate resolves only if
  `offers.location` is itself `geography`. The frozen schema guidance and ADR-0023 say the first
  spatial column is declared as `Unsupported("geometry")`, and SP05 §3.B keeps both
  `geometry(Point,4326)` and `geography(Point,4326)` open until T04. If T04 lands on `geometry`, the
  predicate either fails to resolve (no implicit geometry↔geography cast in `ST_DWithin`) or must add
  `offers.location::geography`, which **defeats the GiST index** on the geometry column and forces a
  scan; and if the geometry overload were ever chosen, `$4 = 5000` (metres) would be read as degrees,
  which is effectively no radius filter at all.
- **Load at which it matters.** The first spatial table (T04), i.e. before any search runs — this is a
  latent landmine, not a load-dependent one, but it determines whether the search path scales at all.
- **Concrete fix.** Decide the column as `geography(Point, 4326)` (SP05 §4.1 recommends geography at
  pilot scale for native metres) with a `USING GIST (location)` index, and keep the predicate as
  written; or, if geometry is chosen, cast consistently *and* add a geography expression index so the
  GiST index is still usable. Validate the real plan with `EXPLAIN ANALYZE` before calling it
  optimized (`AGENTS.md:54`). **Cannot be verified without the column type**, which T04 owns.

### H4 — No index plan for the offer access patterns, and the availability filter is not indexable (area: database and queries)

There is no `offers` or `markets` migration — the migrations on disk are the identity schema
(`20261015150121`), the PostGIS extension (`20261017190000`), and the terms-version table
(`20261017200000`). The access patterns the contracts imply, and the plan I expect, are:

- **`recent` sort** (`postgis-offer-query.ts:44-51`, `ORDER BY offers.created_at DESC, offers.id ASC`)
  — expects a btree on `(market_id, created_at DESC, id)` so the market predicate is the leading
  column. **Without it: a sequential scan of `offers` + sort.**
- **`distance` sort** (`:46-47`, `ORDER BY distance_meters ASC, offers.id ASC`) — the `ST_DWithin`
  bounding box can use a GiST index on `location`, but there is no KNN `<->` ordering, so the distance
  sort is a **post-scan sort** on top of the GiST scan. **Without the GiST index: a sequential scan
  with the spheroid distance computed per row.**
- **Availability filter** — SP03 §3.4 and `SYNTHESIS.md:113` make the search predicate
  `available_amount > 0`, where `available = initial_amount − reserved_amount − completed_amount` is a
  **computed expression**. No plain index serves it, so it filters *after* the market/spatial scan.
- **Terms-version lookups** (`offers/application/offers.ports.ts:25-29`) — `current(offerId)` is served
  by the unique `(offer_id, version)` index (`20261017200000/migration.sql:37-38`) as a backward index
  scan taking the first row; this one **is** indexed and correct.
- **Load at which it matters.** At pilot scale — one market, hundreds of offers — a sequential scan is
  the *correct* plan (`AGENTS.md:53`) and should not be "fixed". It breaks as offers per market reach
  the tens of thousands, or as markets multiply and a query that cannot use a market-leading index
  scans across all of them.
- **Concrete fix.** Add the `(market_id, created_at, id)` btree and the `USING GIST (location)` index
  with the offers migration; if the availability filter proves hot, add a partial index or a stored
  boolean column maintained by the same one-writer transaction. **Verify with `EXPLAIN ANALYZE` on
  seeded, representative data** — the plans above are predictions from the SQL text and PostGIS
  semantics, not measurements, because the tables do not exist yet.

### M1 — Connection pool and query timeouts are unconfigured (area: connection/request handling)

`apps/api/src/database/prisma.service.ts:19-25`.

- **Failure mode.** `PrismaPg` is constructed with only `connectionString`; the underlying `pg` pool
  uses its default `max` (10 per process) and no connection or statement timeout. A handful of slow
  spatial scans or in-memory paginations (H1) occupy all ten connections; new requests queue on
  connect and, with no request timeout (M2), hang rather than fail fast. The interaction with H1 is
  the real risk: the slowest query family is also the one that holds a pooled connection for its whole
  duration.
- **Load at which it matters.** Concurrency above the pool size, or a single slow-query family — both
  arrive together as the offer set grows.
- **Concrete fix.** Set an explicit pool size sized to the database and the number of API replicas,
  and set `statement_timeout` (and `idle_in_transaction_session_timeout`) on the role or the
  connection so a runaway query is killed. **Cannot be verified without the deployed pool size and
  replica count.**

### M2 — No HTTP request timeout, and Helmet/CORS/payload limits are not configured (area: connection/request handling)

`apps/api/src/main.ts:4-11` and `apps/api/package.json` (no `helmet` dependency).

- **Failure mode.** `bootstrap()` creates the app, sets the `/v1` prefix, and listens — no
  `getHttpServer().setTimeout(...)`, no Helmet, no explicit CORS, no explicit body-size limit. A slow
  query keeps the socket open indefinitely; the mobile client has no timeout either (M4), so the two
  ends wait on each other. `AGENTS.md:80` requires request rate, payload size, and timeouts
  appropriate to risk. Rate limiting *is* present (`auth.module.ts:78`, global 100/min, plus per-route
  `@Throttle`), so this is specifically the timeout/payload/CORS half.
- **Load at which it matters.** Any degraded query; without a timeout there is no load-shedding and no
  fast failure.
- **Concrete fix.** Add an HTTP request timeout and a `statement_timeout` (M1), configure Helmet and
  CORS for the mobile origin, and set an explicit JSON body limit.

### M3 — Session rotation revokes the whole token family on a lost race (area: concurrency)

`apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts:542-585` and
`apps/api/src/auth/application/session.service.ts:45-80`.

- **Failure mode.** `rotateSession` does an `updateMany` compare-and-swap to revoke the presented token
  (`:546-558`); the loser (`revoked.count === 0`) revokes the **entire token family** (`:566-572`).
  This is correct anti-replay behaviour and must stay a CAS (`AGENTS.md:47`). The scalability cost is
  benign-race amplification: two concurrent refreshes presenting the same token — exactly what a
  mobile retry on a poor connection produces — turn into a forced re-login, not a retried page. Today
  the client happens to avoid this because refresh only runs once at launch
  (`apps/mobile/src/features/session/use-restore-session.ts:20-54`) and there is no 401→refresh
  interceptor, so it is single-flight by construction; that guarantee is implicit and easy to lose.
- **Load at which it matters.** Flaky mobile networks and any future automatic token refresh.
- **Concrete fix.** Keep the CAS. Make refresh single-flight in the client and treat a lost race as
  retry-once-with-the-new-token rather than a hard logout; a short grace window keyed to
  `replacedBySessionId` would absorb the benign case without weakening replay detection.

### M4 — Mobile has no request timeout or retry policy (area: mobile)

`apps/mobile/src/services/api.ts:57-66`.

- **Failure mode.** `fetchBaseQuery` is configured with `baseUrl` and `prepareHeaders` only — no
  `timeout`, no retry. React Native's `fetch` has no default timeout, so a hung request leaves a
  screen in `isLoading` indefinitely (see `apps/mobile/src/app/home.tsx:41`), which on a low-end
  Android over a poor connection reads as "the app is broken". `refetchOnReconnect` **is** correctly
  wired through NetInfo (`store/connectivity.ts:11-14`, `store/index.ts:16`) — that part is right.
- **Load at which it matters.** Poor connectivity, which is the MVP's operating environment.
- **Concrete fix.** Add a `timeout` and a small bounded retry to `fetchBaseQuery`. Response shapes are
  already bounded (below), so payload size is not the mobile risk.

### L1 — Market-context guard performs a DB lookup on every market-scoped request (area: connection/request handling)

`apps/api/src/common/market-context/market-context.guard.ts:44`, `market-context.port.ts:11-13`.

One `markets.exists()` round-trip per market-scoped request before the use case. With a single market
row this is a primary-key/unique lookup and negligible; it matters only at very high RPS. **Fine at
MVP scale — do not optimise yet.** If it ever shows up in a profile, cache the market list in-process
and invalidate on change.

### L2 — Insert-only terms-version triggers are correct and cheap (area: concurrency)

`apps/api/prisma/migrations/20261017200000_offer_terms_versions_immutability/migration.sql:43-58`.

The `BEFORE UPDATE`/`BEFORE DELETE` triggers raise on any mutation the design never performs, so the
hot **insert** path pays nothing, and the monotonic `(offer_id, version)` unique index (`:37-38`) both
guards version numbering and serves `current(offerId)`. **Correct and cheap — no change.** Note the
immutability is enforced in the database, not only in `offer-terms-version.ts:13-17`.

### L3 — Phone-challenge attempt counter is read-then-write (area: concurrency)

`apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts:461-489`.

The increment is atomic (`attempts: { increment: 1 }`, `:480`), so no increment is lost; but the
`attempts < maxAttempts` bound is read at the start of the transaction (`:468`), so concurrent wrong
codes can slightly exceed the cap. Low impact at MVP. Worth noting only because `AGENTS.md:41` is
strict about not downgrading an atomic guard.

### L4 — The client does not send `X-Market-Id` (area: mobile)

`apps/mobile/src/services/api.ts:59-65` sets only `Authorization`. The frozen contract requires a
required `X-Market-Id` header on every market-scoped endpoint
(`openspec/changes/archive/2026-10-17-t02-technical-contracts/design.md:71-74`). No market-scoped
endpoint exists in the client yet, so this is a gap T10/T16 must close, not a current bug.

---

## Bounded shapes and correct guards (verified, no change)

- **Response shapes are bounded.** `OfferDto` (`offers/adapters/in/http/offer.dto.ts:9-13`) and
  `SearchMatchDto` (`search/adapters/in/http/search.dto.ts:11-16`) carry a fixed, small field set —
  `SearchMatchDto` returns only `{ offerId, distanceMeters }`, not the whole offer or seller profile.
  The one shared `CursorPage<T>` (`cursor-pagination.ts:9-13`) caps `items` at 100. No endpoint exposes
  an unbounded relation.
- **Cursors are opaque and re-validated.** base64url payload (`cursor.ts:22-24`), re-validated on input
  with a coded `400` for a tampered cursor (`:26-39`).
- **Transactions are scoped to one operation with no I/O inside them.** Every `$transaction` in the
  auth repository wraps two to four fast statements and nothing else; email and SMS are sent **after**
  the transaction commits (`auth.service.ts:61-79`, `:126-138`, `:366-377`). `AGENTS.md:52` is honoured
  today — the rule must survive T08/T09 when the publish gate's entitlement could become a network
  call.
- **The inventory reservation guard is the right design.** SP03 §3.2/D's
  `UPDATE offers SET reserved_amount = reserved_amount + $amount WHERE id = $offerId AND
  initial_amount − reserved_amount − completed_amount >= $amount RETURNING id` is a single-statement
  CAS inside the same transaction that flips the agreement (`SYNTHESIS.md:154-171`, `AGENTS.md:41,46`).
  It is not implemented yet (T09), but the frozen contract is correct. Its contention is a per-offer
  row lock held for the life of the transaction — see M5.

### M5 — Inventory reservation serialises per offer and must stay I/O-free (area: concurrency)

Design only: `offers/application/offers.ports.ts`, SP03 §3.2, `SYNTHESIS.md:154-171`.

- **Failure mode.** The CAS takes a row lock on the offer until the transaction commits; every
  confirmation against one popular offer serialises. This is the intended price of "no oversell", and
  it is bounded to a single row. The risk is scope: if the same transaction also performs I/O — a
  network-backed entitlement/eligibility check, or a quote/terms fetch that becomes a remote call —
  the lock is held across the network round-trip and the serialisation window explodes.
- **Load at which it matters.** A hot offer with many simultaneous confirmations; a network-backed
  subscription port.
- **Concrete fix.** Keep the reserve + agreement-state change in one short transaction with **no I/O**,
  and resolve eligibility/entitlement *before* the transaction (the ports are in-memory today —
  `subscriptions/adapters/out/entitlement.adapter.ts:11-14` — so this is a rule to preserve, not a bug
  to fix). Do not move the guard to `SELECT ... FOR UPDATE`; the CAS is the endorsed form.

---

## Fine at MVP scale — do not optimise yet

Premature optimisation is a real risk in a one-market MVP. The following are **correct as they are**;
changing them now would add complexity without a measured need.

- **Sequential scans on `offers`.** With one market and a few hundred offers, a seq scan is the
  *correct* plan (`AGENTS.md:53`). Add only the indexes the named access patterns justify, not one per
  column.
- **`geography` vs `geometry` cost.** The spheroid distance in `ST_DWithin` is more expensive than a
  planar one, and geography GiST indexes cost more to build (SP05 §2.2). SP05 §4.1 already accepts this
  at pilot scale. Revisit a projected CRS **only if** `EXPLAIN ANALYZE` on representative data shows a
  problem.
- **The `_count` include in `findByIdentifier`/`findById`** (`prisma-identity.repository.ts:92-112`) —
  one extra aggregate per lookup; negligible.
- **No TTL/cleanup job on `auth_challenges`, `email_action_tokens`, `phone_verification_challenges`.**
  They stay small at pilot volume; retention is a product/legal decision (`AGENTS.md:58`), not a
  performance one yet.
- **In-memory auth delivery adapters, a single API instance, no read replicas, no Redis, no second
  cache.** None is warranted. `AGENTS.md:96` forbids a second server-state cache beside RTK Query
  anyway.
- **Interactive `$transaction`s in auth** — two to four fast statements, no I/O, no long-held locks.
- **`argon2` password hashing** is the heaviest per-request CPU in the API (`auth.service.ts:58,88,93`)
  and is deliberately done outside any transaction. At pilot sign-in volume it is not a bottleneck;
  it is listed here only so it is not mistaken for one. If sign-in latency ever matters, measure the
  hash cost before touching its parameters.

---

## What I could not verify without data

Stated explicitly, because the rest of this audit must not be read as measured:

- **No query plan for the market-scoped spatial search.** The `offers`/`markets` tables and the search
  adapter do not exist, so the expected plans in H4 are predictions from the SQL text and PostGIS
  semantics. Producing a real plan requires T04 to create the column and seeding representative data,
  then `EXPLAIN ANALYZE` (`AGENTS.md:54`).
- **The `offers.location` type (H3).** Whether the predicate resolves and whether the GiST index is
  usable is unverifiable until T04 picks `geography` or `geometry`.
- **Pool saturation (M1).** Depends on the deployed `pg` pool size and the number of API replicas;
  neither is in the repository.
- **The threshold at which H1/H4 actually hurt.** Real pilot offer counts per market are unknown, so
  "low thousands" is an estimate from the shape of the code, not a measurement.
- **Mobile performance on a low-end Android over a poor connection (M4).** The finding is from
  configuration (no timeout), not profiling.
- **`argon2` cost per login.** Not measured; flagged as the heaviest per-request CPU, not as a proven
  bottleneck.

## Evidence map

| Area | Key files |
| --- | --- |
| Pagination | `apps/api/src/common/pagination/cursor-pagination.ts`, `cursor.ts` |
| Spatial path | `apps/api/src/markets/domain/market-predicate.ts`, `adapters/out/postgis-offer-query.ts`, `docs/spikes/SP05-*.md` |
| Database / migrations | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261015*`, `20261017190000*`, `20261017200000*` |
| Concurrency | `apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts`, `auth/application/session.service.ts`, `docs/spikes/SP03-*.md`, `docs/spikes/SYNTHESIS.md:154-171` |
| Connection / request | `apps/api/src/database/prisma.service.ts`, `apps/api/src/main.ts`, `apps/api/src/common/market-context/market-context.guard.ts` |
| Mobile | `apps/mobile/src/services/api.ts`, `apps/mobile/src/store/{index,connectivity}.ts`, `apps/mobile/src/features/session/use-restore-session.ts` |
