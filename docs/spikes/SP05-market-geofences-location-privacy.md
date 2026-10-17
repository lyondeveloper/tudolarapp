# SP05 — Specify market geofences, phone GPS, and location privacy

Research-only spike. No application code, schema, or migration was changed. Every claim below is
grounded in a repository file with a line reference or a cited external page; claims I could not
verify are marked as assumptions.

## 1. Task and acceptance criteria

Quoted from the backlog snapshot `/tmp/backlog2.md` (SP05, lines 59–64):

> ### SP05 — Specify Market Geofences, Phone GPS, and Location Privacy
> **Suggested owner:** Product + mobile + geospatial backend. **Depends on:** T00; independent spike, parallelizable.
> - Identify the authoritative market polygon and define boundary inclusion, coordinate handling, and PostGIS query behavior.
> - Specify GPS behavior: authorized active GPS centers proximity within the active node; without GPS/permission, search the entire active node; an explicit in-node prompt location may narrow results but never expand the node.
> - Resolve what to do when active GPS is outside the selected node, and define permission-denied UX, location retention, and what location details other users can see.
>
> **Acceptance criteria:** a geospatial decision brief and test matrix cover inside/boundary/outside coordinates, GPS off/denied, explicit prompt locations, radius crossing a boundary, and privacy exposure; no query can return an out-of-node offer.

The spike is research-only; the polygon source for Ciudad Ojeda is the product owner's decision
(backlog line 109, T01), not this spike's.

## 2. Evidence and sources

### 2.1 Observed in the repository

- **A market is geographic, not a string.** `README.md:27` — "A market defines an active service
  area, represented geographically rather than only by a city-name string. Each offer belongs to one
  market… User identity and authentication remain global… market selection is not an authorization
  grant." `docs/architecture.md:47-48` repeats this and adds that a market "may correspond to a city
  for the MVP, but a market is not just a city-name string; its service area is represented
  geographically and queried with PostGIS." `openspec/config.yaml:26-28` states the same rule.
- **No market model exists yet.** `apps/api/prisma/schema.prisma` declares six identity models
  (`User`, `PasskeyCredential`, `AuthSession`, `AuthChallenge`, `EmailActionToken`,
  `PhoneVerificationChallenge`); there is no `Market`, `Offer`, or spatial column. A repository-wide
  search for `market` under `apps/` returns no matches. `docs/audit/t00-baseline.md:211` records T04
  ("Model geographic markets and prepare Ciudad Ojeda") as "Not implemented. No market model; PostGIS
  is installed but unused."
- **PostGIS is installed but unused.** `docker-compose.yml:6` pins `postgis/postgis:17-3.5`;
  `docker/initdb/01-create-databases.sql` runs `CREATE EXTENSION IF NOT EXISTS postgis` in both
  `tudolar` and `tudolar_test`. The identity migration
  (`apps/api/prisma/migrations/20261015150121_init_identity_schema/migration.sql`) contains **no**
  spatial column, no `CREATE EXTENSION`, and hand-written `CHECK` constraints only (lines 144–165).
- **The engine rules for spatial work are fixed.** `AGENTS.md:42` — "Prisma has no native geometry
  type. Keep spatial columns and `ST_DWITHIN` queries in migrations and `$queryRaw`, and decide the
  `Unsupported(...)` mapping when the first spatial table is introduced." `AGENTS.md:50` — "For
  proximity searches, use consistent SRIDs and understand units: `geometry` uses the SRID's units;
  `geography` uses meters. Use `ST_DWithin` for proximity filters and appropriate GiST spatial
  indexes; validate the real query plan." `AGENTS.md:39` — `CREATE EXTENSION postgis` is an
  unmodelled, privileged step kept in hand-written SQL, like `CHECK` constraints.
- **Data-protection and permission rules are fixed.** `AGENTS.md:52` — "Collect personal data only
  for a defined purpose, with controlled access and retention; delete or anonymize it when
  appropriate." `AGENTS.md:98` — "Request permissions only when a feature needs them, explain why,
  and handle denial/revocation without unnecessarily blocking the app."
- **User-visible location policy exists.** `docs/flows/search-and-contact.md:51` — "Show approximate
  distances/meeting areas, never users' home addresses." Line 47 adds that a location hint pointing
  to another market must prompt the user "to switch or clarify rather than silently searching there."
- **The search contract already carries location criteria.** `docs/flows/search-and-contact.md:35-47`
  shows the LLM output with `location_hint` and `max_distance_km`, and states the backend "ensures
  the area is within the selected market before building parameterized SQL scoped to that market and
  using PostGIS for proximity."
- **The mobile client has no location capability.** `apps/mobile/package.json:5-43` lists no
  `expo-location`; `apps/mobile/app.json:30-41` declares no location permission plugin. The mobile
  `AGENTS.md` requires adding native modules with `npx expo install` and configuring permissions in
  `app.json`, not in the generated native projects.
- **Testing conventions.** `docs/testing/e2e.md:56-72` defines how API scenarios are added
  (`apps/api/test/<area>.e2e-spec.ts`, asserting observable contract and resulting DB state) and that
  the API suite runs against a PostGIS-installed disposable database.

### 2.2 Observed in external references

- **`ST_DWithin` units.** PostGIS: the `geometry` overload takes a distance "in units defined by the
  spatial reference system"; the `geography` overload takes meters (default spheroid). It "includes a
  bounding box comparison that makes use of any indexes that are available." —
  https://postgis.net/docs/ST_DWithin.html
- **Use `ST_DWithin`, not `ST_Distance`/`ST_Buffer`, for radius.** `ST_DWithin` uses a spatial index
  and is more accurate than a buffer approximation. — https://postgis.net/documentation/tips/st-dwithin/
- **Boundary inclusion.** `ST_Contains` "returns `FALSE`" when a point lies on the boundary, whereas
  `ST_Covers` "returns `TRUE`"; the docs say `ST_Covers` "generally… should be used instead of
  `ST_Contains`, since it has a simpler definition which does not have the quirk that 'geometries do
  not contain their boundary'." — https://postgis.net/docs/ST_Contains.html ,
  https://postgis.net/docs/ST_Covers.html
- **geometry vs geography.** "The geography type is very convenient for people whose data is of
  global extent… However, calculations on the spheroid are very expensive, so many queries will be
  slower in geography than geometry." Only a subset of functions is implemented for geography,
  including `ST_Covers`, `ST_DWithin`, and `ST_Intersects`; building a GiST index on geography is more
  expensive than on geometry. — https://postgis.net/documentation/faq/geometry-or-geography/
- **Expo location API surface.** `Location.requestForegroundPermissionsAsync()` returns a `status`;
  `Location.getCurrentPositionAsync({ accuracy })` returns a position whose `coords` include
  `latitude`, `longitude`, and `accuracy`; `Location.Accuracy` ranges from `Lowest` (≈3 km) through
  `Balanced` (≈100 m) and `High` (≈10 m) to `BestForNavigation`. —
  https://docs.expo.dev/versions/v54.0.0/sdk/location/

### 2.3 Assumed (not verifiable from the repository)

- The authoritative Ciudad Ojeda polygon and its source (administrative boundary, operator-drawn
  polygon, geocoding result, or licensed dataset) is an open product decision (backlog line 109); no
  source is present in the repository.
- Exact retention durations, coordinate precision, default radius, and GPS-accuracy thresholds are
  product/legal decisions; nothing in the repository fixes them.
- The Expo SDK 57 `expo-location` page was not fetched (web fetch was denied in this environment);
  the API surface above is cited from the SDK 54 page and should be re-checked against SDK 57 before
  implementation, per `apps/mobile/AGENTS.md`.

## 3. Options considered

### A. Market representation
1. **City-name string.** Simplest, but contradicts `README.md:27` and `architecture.md:47` and cannot
   answer "is this coordinate inside the market?". **Rejected.**
2. **Polygon stored in PostGIS.** Matches the fixed decision; supports inclusion and proximity in one
   engine. **Kept.**

### B. Spatial type and SRID
1. **`geometry(Polygon/Point, 4326)`.** GPS and GeoJSON are WGS84, so no transform on input;
   distances are in degrees, so `ST_DWithin` cannot take meters directly. **Kept with a
   meters-capable predicate (see below).**
2. **`geography(..., 4326)`.** Meters natively, spheroid-accurate, and supports `ST_Covers` and
   `ST_DWithin`; slower per the FAQ and costlier to index. **Kept as the recommended distance type
   at pilot scale.**
3. **A projected CRS (e.g. a UTM zone for Zulia) in meters.** Fastest planar math and native meters,
   but requires transforms at the boundary and a second SRID to keep consistent. **Kept only as a
   fallback if `EXPLAIN` shows the geography plan is inadequate.**

### C. Boundary-inclusion predicate
1. **`ST_Contains`.** Rejects coordinates exactly on the polygon edge, which the acceptance criteria
   call a distinct case. **Rejected.**
2. **`ST_Covers`.** Boundary-inclusive and recommended by the PostGIS docs. **Kept.**

### D. Representing the spatial column in Prisma
1. **A normal Prisma field.** Impossible: `AGENTS.md:42` states Prisma has no geometry type.
   **Rejected.**
2. **`Unsupported("geography(Polygon, 4326)")` (and `Unsupported("geography(Point, 4326)")`).**
   Keeps the schema authoritative while acknowledging the field is not in the generated client; reads
   and writes go through `$queryRaw`/`$executeRaw`. **Kept**, with the mapping decided at the first
   spatial table (T02/T04).

### E. Where proximity is computed
1. **Server-side `ST_DWithin` in the market-scoped query.** Single source of truth; the node bound
   and the radius filter live in the same SQL, so an out-of-node row cannot slip through.
   **Kept.**
2. **Client-side distance sort.** Would move the boundary decision to the client and risk returning
   out-of-node offers. **Rejected.**

### F. GPS that falls outside the active node
1. **Silently expand the radius or search the nearest market.** Violates the node invariant and
   `search-and-contact.md:47`. **Rejected.**
2. **Treat it as "no usable GPS": search the entire active node and surface a prompt to switch or
   clarify.** Keeps the node bound, matches the no-GPS rule, and is honest with the user. **Kept**
   (exact copy is a product decision).

### G. Location privacy
1. **Persist the raw GPS fix.** Enables analytics but stores precise personal data with no defined
   purpose, against `AGENTS.md:52`. **Rejected as the default.**
2. **Use the fix transiently for the search request and never persist it; if a location must be
   stored for an offer, store a coarse, seller-chosen area.** **Kept**, with retention/precision
   left to the product owner and legal.

### H. Permission scope
1. **Background location.** Unneeded for an on-demand search and harder to justify. **Rejected.**
2. **Foreground, on-demand, with a clear rationale and a graceful denial path.** Matches
   `AGENTS.md:98`. **Kept.**

## 4. Recommendation

1. **Represent each market by a polygon in PostGIS**, stored as an `Unsupported("geography(Polygon,
   4326)")` field on a `markets` table, with a `CREATE EXTENSION postgis` (already in
   `docker/initdb/`) and the column added through a Prisma `--create-only` migration, per
   `AGENTS.md:39,42`. Canonical SRID is **4326** for both the boundary and any stored point, so GPS
   and GeoJSON need no transform. Distance predicates use the `geography` overload for native meters
   (`AGENTS.md:50`), accepting the documented spheroid cost at pilot scale; revisit a projected CRS
   only if `EXPLAIN ANALYZE` on representative data shows a problem.
2. **Boundary inclusion uses `ST_Covers(market.boundary, point)`**, so a coordinate exactly on the
   edge is inside. Proximity uses `ST_DWithin(point, center, radius_meters)`; radius filters never
   use `ST_Distance` or `ST_Buffer`. Both get a **GiST** index on the spatial column
   (`AGENTS.md:50`; PostGIS radius tips).
3. **Market scope is a mandatory predicate in every offer query**, not an optional filter: an offer
   is returned only when `ST_Covers(market.boundary, offer.location)` and `offer.market_id` equals
   the active market. The GPS radius is a second, narrowing predicate inside that scope. This is the
   only construction under which "no query can return an out-of-node offer" holds.
4. **GPS behavior.** With permission granted, the current fix becomes the proximity center and
   narrows results within the node. Without a fix or without permission, the search returns the whole
   node. An explicit, in-node location the user types or picks may also narrow results but is clamped
   to the node. A fix outside the node never expands it: fall back to whole-node search and offer to
   switch markets. Phone accuracy (`coords.accuracy`, meters) is treated as uncertainty: an
   imprecise fix should degrade to whole-node search rather than assert a wrong center; the threshold
   is a product decision.
5. **Privacy.** The search center is request-scoped and not persisted by default. No user's
   coordinates are ever exposed to another user: the API returns approximate distance bands or
   meeting areas, never coordinates or addresses (`search-and-contact.md:51`). Any offer location is
   a coarse, seller-chosen area inside the market, not a home address. Retention and precision, if
   any location is stored, are product/legal decisions (`AGENTS.md:52`).

## 5. Unresolved decisions

| # | Decision | Owner |
| --- | --- | --- |
| U1 | Authoritative Ciudad Ojeda polygon and its source/licence | Product owner (T01, backlog line 109) |
| U2 | Whether seller profiles and subscription billing are global or market-specific | Product owner (`README.md:27`) |
| U3 | Exact UX and copy when GPS is outside the active node (prompt to switch vs. whole-node) | Product owner |
| U4 | Location retention period, legal basis, and whether raw fixes are stored at all | Product owner + legal (SP08) |
| U5 | Precision/coarseness at which any stored location is kept | Product owner + technical lead |
| U6 | Offer location granularity (neighborhood vs. point) and who chooses it | Product owner (SP07) |
| U7 | Final spatial type/SRID and the `Unsupported(...)` mapping for the first spatial table | Technical lead (T02/T04) |
| U8 | GPS-accuracy threshold above which the fix is treated as whole-node | Product owner + technical lead |
| U9 | Whether GPS flows get device-level E2E coverage (no macOS runner yet) | Technical lead + QA (SP09/SP10, `e2e.md:103-108`) |

## 6. Product and technical impact

- **Data model.** A new `markets` table (name, boundary, active flag) and, later, a spatial
  `location` on `offers`. Both spatial columns are `Unsupported(...)` and reached through
  `$queryRaw`; a Prisma `migrate dev` must never be allowed to drop the PostGIS extension or the
  hand-written objects (`AGENTS.md:39`).
- **API.** Search must resolve and validate the active market server-side on every call; a location
  hint can narrow but never switch the market (`architecture.md:48`, `search-and-contact.md:47`).
  DTOs validate numeric ranges and reject coordinates outside the market rather than trusting the
  client (`AGENTS.md:71-72`).
- **Hexagonal shape.** A `markets/` module with a domain value object for the boundary and a
  proximity/search port; the PostGIS repository is an `adapters/out` implementation. The LLM parser
  stays a parser and never sees SQL or ranking (`architecture.md:52`).
- **Mobile.** `expo-location` is a new native dependency (add with `npx expo install`; declare the
  permission in `app.json`). The client requests foreground permission only when search needs it,
  explains why, and degrades to whole-node search on denial (`AGENTS.md:98`). A maps/geocoding
  provider is still undecided (`architecture.md:40`).
- **Performance.** `geography` predicates are costlier than planar ones; the pilot volume is small,
  but `EXPLAIN ANALYZE` on representative data must confirm the GiST plan before the query is called
  optimized (`AGENTS.md:48`).
- **Privacy/compliance.** Retention and precision are new obligations that flow into the privacy
  policy and the SP08 legal review.

## 7. Testable scenarios

All are suitable for the API e2e suite (`apps/api/test/*.e2e-spec.ts`, per `e2e.md:56-60`).

- **WHEN** an offer's location is strictly inside the active market **THEN** a search scoped to that
  market returns it.
- **WHEN** an offer's location lies exactly on the market boundary **THEN** the search returns it
  (`ST_Covers`, not `ST_Contains`).
- **WHEN** an offer's location is outside the active market **THEN** no market-scoped search returns
  it, for any radius or GPS center.
- **WHEN** GPS is granted and inside the node **THEN** results are narrowed to the radius around the
  fix and every result is still inside the node.
- **WHEN** GPS is denied or unavailable **THEN** the search returns the whole node without a
  proximity filter and does not fail.
- **WHEN** the user supplies an explicit in-node location **THEN** results narrow within the node and
  never expand it.
- **WHEN** the user supplies a location hint pointing to another market **THEN** the response asks
  the user to switch or clarify and returns no out-of-node offer.
- **WHEN** a GPS radius around the fix would cross the market boundary **THEN** offers beyond the
  boundary are excluded even though they are within the radius.
- **WHEN** the GPS fix is outside the active node **THEN** the search falls back to whole-node
  results (or prompts to switch) and never silently searches another market.
- **WHEN** any search response is inspected **THEN** it contains no other user's coordinates or home
  address, only approximate distance or area.
- **WHEN** the same search is repeated **THEN** no raw GPS coordinate was persisted for the request.

## 8. Sources reviewed

- `/tmp/backlog2.md` (SP05 lines 59–64; T01 line 109).
- `AGENTS.md` (lines 33–52 PostgreSQL/PostGIS; 71–72 validation/authorization; 95–100 React Native;
  102–116 primary references).
- `apps/mobile/AGENTS.md` (Expo native-module and permission conventions).
- `README.md` (lines 25–27 geographic market scope; 49–55 implementation status).
- `docs/architecture.md` (lines 43–53 responsibility boundaries).
- `docs/flows/search-and-contact.md` (lines 31–54 LLM contract and safety/reputation).
- `docs/flows/seller-offer-lifecycle.md`, `docs/flows/authentication.md` (market context inheritance;
  global identity).
- `docs/testing/e2e.md` (lines 8–72 entry points, isolation, adding a scenario; 98–108 CI gap).
- `docs/audit/t00-baseline.md` (lines 200–217 backlog coverage; T04 status).
- `openspec/config.yaml` (lines 21–28 PostgreSQL/PostGIS and market rules).
- `openspec/specs/mobile/app-shell/spec.md`, `openspec/specs/testing/e2e-foundation/spec.md`
  (scenario style and coverage guarantees).
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261015150121_init_identity_schema/migration.sql`
  (no spatial columns; hand-written objects).
- `apps/api/package.json`, `apps/mobile/package.json`, `apps/mobile/app.json`,
  `docker-compose.yml`, `docker/initdb/01-create-databases.sql`.
- External: PostGIS `ST_DWithin`, `ST_Contains`, `ST_Covers`, the geometry-or-geography FAQ, and the
  radius-query tip (URLs in §2.2); Expo Location SDK 54 (URL in §2.2).
