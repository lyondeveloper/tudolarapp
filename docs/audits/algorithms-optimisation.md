# Algorithms and optimisation audit

Scope: the algorithms and data structures the API actually uses, judged on complexity, correctness,
exactness, and query-plannability. This is a review; no code, test, or configuration was changed.

Method: read of `AGENTS.md`, the domain modules under `apps/api/src/`, their specs, the Prisma schema
and migrations, and the ADRs the code cites (0001, 0008, 0010, 0019, 0023, 0025). Where a claim needs a
query plan or a benchmark I say so and describe the measurement instead of asserting the conclusion.

## Verdict

The algorithmic core of this API is small and, with two exceptions, deliberately correct: the money
type is exact (integer minor units in a `bigint`, no binary floating point anywhere), the frozen
catalog is a genuine O(1) lookup with the right prototype-safety guard, the auth challenge/session
guards are real compare-and-swaps, the quote window is correctly half-open, and the spatial predicate
is parameterized with the market scope welded to the proximity filter. The two exceptions are the
shared cursor paginator and the phone-challenge verifier. `paginate` is algorithmically the weakest
piece in the tree: it materializes and sorts the *entire* collection on every page (O(n log n) time and
O(n) memory per page, O(n² log n) to walk a collection) and it resolves the cursor by scanning for the
row it names, so a row deleted between pages turns an ordinary "next page" request into a `400`
(`cursor-pagination.ts:52-65`); its correctness also depends on a total-order/tie-break contract that
is documented but not enforced. Separately, `verifyPhoneChallenge` reads then writes instead of using
the compare-and-swap every other challenge type uses, so two concurrent correct submissions can both
consume and the attempt cap can be exceeded under concurrency
(`prisma-identity.repository.ts:454-490`). Money is exact and `bigint` is the right representation, but
the domain imposes no upper bound while the storage column is `NUMERIC(24,6)`, so an amount at or above
`10^18` becomes a database `numeric field overflow` rather than a validation error. None of this needs a
rewrite: the catalog, the money arithmetic, the half-open quote window, the CAS guards, and the
pagination slice arithmetic are already the right choices and should be left alone. The two
optimisations worth doing before the first read-heavy endpoint ships are (1) push pagination into SQL
as a keyset seek instead of sorting in memory, and (2) make the proximity filter index-driven by
declaring the location column as `geography(Point,4326)` with a GiST index — verified with
`EXPLAIN ANALYZE` when the `offers` table lands.

## Findings

### F-1 — High — the cursor names a row, not a position; `paginate` sorts and scans the whole collection

`apps/api/src/common/pagination/cursor-pagination.ts:52-65`

```ts
const ordered = [...items].sort(options.compare);          // O(n log n) + O(n) copy, every page
let start = 0;
if (query.cursor !== undefined) {
  const payload = decodeCursor(query.cursor);
  const index = ordered.findIndex((item) => {              // O(n) scan, every page
    const key = options.cursorOf(item);
    return key.k === payload.k && key.i === payload.i;
  });
  if (index === -1) throw new ApplicationError(ApiErrorCode.INVALID_CURSOR);
  start = index + 1;
}
```

Two problems, one asymptotic and one correctness/robustness:

- **Cost.** Every page copies and fully sorts the entire collection, then scans it linearly to find
  the cursor. Paging a collection of `n` items `k` at a time is O(n² log n) time and O(n) peak memory,
  and the caller has already had to materialize all `n` rows (`items: readonly T[]`) before calling.
  For the MVP's Ciudad Ojeda offer counts this is invisible; it is the wrong shape for a shared
  contract that "lands with T04/T10/T12" and will be copied into the SQL adapters.
- **Correctness/robustness.** The cursor payload is `{k, i}` — the sort key and id of the *last row on
  the page* (`cursor.ts:9-14`) — and `paginate` re-derives the position by searching for that row. If
  the row was deleted (or its sort key changed) between requests, `findIndex` returns `-1` and the
  client gets `INVALID_CURSOR` instead of the next page. The spec enshrines this
  (`cursor-pagination.spec.ts:122-131`), so it is intended behaviour, but it is a weaker design than a
  positional cursor.

**Worked counter-example (deletion).** A market lists offers `[o1, o2, o3]`, page size 2. Page 1
returns `[o1, o2]` with `nextCursor = encode({k: o2.createdAt, i: o2.id})`. The seller deletes `o2`
(a supported lifecycle step). The client requests page 2 with that cursor: `ordered = [o1, o3]`,
`findIndex` finds no `{o2.createdAt, o2.id}`, and the request fails with `400 INVALID_CURSOR`. With a
keyset cursor the query would be `WHERE (created_at, id) < ($k, $i) ORDER BY created_at DESC, id ASC
LIMIT n`, which resumes correctly after the deleted row because it compares *positions*, not identity.

**Recommended approach.** Keep the `CursorPayload` shape (it already carries exactly the key needed for
a keyset predicate) but state the contract as positional: the adapter applies the cursor as a
`WHERE (sortKey, id) < (k, i)` seek plus `ORDER BY sortKey, id LIMIT n`, never by searching for a row.
Then `paginate` can either (a) remain a small in-memory helper used only by tests and in-memory
repositories, documented as such, or (b) be deleted in favour of adapters owning the seek. Either way,
the O(n log n)-per-page materialization should not become the production path. This is an optimisation
of the *contract*, not of the arithmetic: the slice/`hasMore` logic itself is correct (see "already
correct").

### F-2 — Medium-High — `verifyPhoneChallenge` is a read-then-write, not a compare-and-swap

`apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts:454-490`

```ts
const challenge = await tx.phoneVerificationChallenge.findFirst({      // read
  where: { userId, phoneE164, consumedAt: null, expiresAt: { gt: now },
           attempts: { lt: maxAttempts } },
  orderBy: { createdAt: 'desc' }, select: { id: true, codeHmac: true },
});
if (!challenge) return false;
if (challenge.codeHmac !== input.codeHmac) {
  await tx.phoneVerificationChallenge.update({ where: { id: challenge.id },
    data: { attempts: { increment: 1 } } });                            // write, unguarded
  return false;
}
await tx.phoneVerificationChallenge.update({ where: { id: challenge.id },
  data: { consumedAt: now } });                                         // write, unguarded
return true;
```

Every other challenge consumer in this file is an atomic compare-and-swap — the guard is in the
`updateMany` `WHERE` and success is `count > 0` (`consumeAuthChallenge` at `:294-304`,
`completeEmailVerification` at `:341-350`, `resetPassword` at `:398-407`,
`completePasskeyRegistration` at `:240-250`, `rotateSession` at `:546-558`). `verifyPhoneChallenge`
breaks that pattern: it reads the challenge, then updates it by primary key with no `consumedAt: null`
/ `attempts: { lt: maxAttempts }` re-check in the write. `AGENTS.md:47` is explicit that challenge
consumption is security-critical and that an atomic guard must not be downgraded to a read-then-write.

**Worked counter-example.** Two requests carry the *correct* code concurrently. Both `findFirst` the
same unconsumed challenge, both compare equal, both `update` `consumedAt` — both return `true`. The
second consume is not rejected. The effect here is benign (`markPhoneVerified` is idempotent), which is
why this is not rated higher. The sharper consequence is the attempt cap: two concurrent *wrong*
guesses both read `attempts = 4` (satisfying `attempts < 5`) and both increment, so the challenge ends
at `attempts = 6` and six guesses were tested against a cap of five. With `C` concurrent requests the
cap is effectively `maxAttempts + C − 1`, not `maxAttempts`. For a 6-digit code this is a marginal
brute-force window, but it is a real deviation from the stated invariant.

**Recommended approach.** Make the success path a CAS, mirroring `consumeAuthChallenge`: consume with
`updateMany({ where: { id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: maxAttempts },
codeHmac }, data: { consumedAt: now } })` and treat `count === 1` as success; make the failure path a
CAS too (`updateMany({ where: { id, consumedAt: null, attempts: { lt: maxAttempts } }, data: {
attempts: { increment: 1 } } })`), or accept the small race explicitly in a comment. I cannot prove the
race fires without running two concurrent transactions against the test database; the measurement is a
two-session `BEGIN; SELECT … ; UPDATE …` interleaving, or a Jest test issuing `Promise.all` of two
`verifyPhone` calls with the same code and asserting exactly one succeeds.

### F-3 — Medium — money has no upper bound, but the storage column is `NUMERIC(24,6)`

`apps/api/src/catalog/money.ts:70-85` vs `apps/api/prisma/migrations/20261017200000_offer_terms_versions_immutability/migration.sql:24-29`

`Money` holds `minorUnits: bigint`. That `bigint` is JavaScript's arbitrary-precision integer, not a
64-bit integer, so `Money` itself cannot overflow: `BigInt('1000000000000000000' + '00')` is a valid
value and `toDecimalString()` renders it. The overflow risk is entirely at the database boundary. The
columns are `NUMERIC(24,6)` — precision 24, scale 6, so **18 integer digits, maximum magnitude just
under `10^18`**. The domain imposes only a `> 0` floor and no maximum (ADR-0010 B5), and nothing
between the domain and the column checks the magnitude.

**Worked counter-example.** `Money.of('999999999999999999.00', 'VES')` → 18 integer digits → stores
fine in `NUMERIC(24,6)` as `999999999999999999.000000`. `Money.of('1000000000000000000.00', 'VES')` →
19 integer digits → `Money` accepts it and `toDecimalString()` returns `"1000000000000000000.00"`, but
the `INSERT` fails with SQLSTATE `22003` `numeric field overflow`. The failure surfaces as a raw
database error at write time rather than a validation error at the API boundary, and there is no
`CHECK` on `give_amount`/`receive_amount`/`min_amount`/`max_amount` to catch it either (the migration
declares none).

**Recommended approach.** Pick one and record it: (a) bound amounts in the domain to the largest value
`NUMERIC(24,6)` can hold (a `Money.of` ceiling per asset, or a validated max in the publish use case),
or (b) widen the columns to `NUMERIC(38,6)` (still exact, comfortably inside any realistic amount).
Option (a) keeps the storage type honest and produces a coded `400`; option (b) is the smaller change.
Either way, `bigint` is the correct representation and should not change — the fix is at the boundary,
not the arithmetic. I cannot demonstrate the `22003` without inserting a row into a live
`offer_terms_versions` table; the measurement is a one-off `INSERT … VALUES (…, '1000000000000000000.00'
::numeric(24,6), …)` against the disposable test database.

### F-4 — Medium — `rate` and `marginPct` bypass the exact-decimal `Money` type and are silently rounded by Postgres

`apps/api/src/offers/domain/offer-terms-version.ts:31-32`, `apps/api/src/offers/domain/offer-terms-version.ts:87-88`, migration `:26-27`

`giveAmount`, `receiveAmount`, `minAmount`, and `maxAmount` are `Money` — exact, scale-checked,
never float. `rate` is `string | null` and `marginPct` is `string`; `applyMaterialEdit` copies them
straight through with no decimal validation and no scale check. The columns are `rate NUMERIC(24,8)`
and `margin_pct NUMERIC(5,2)`.

**Worked counter-examples.** `marginPct = '99.999'` is accepted by the domain and stored into
`NUMERIC(5,2)`, where Postgres rounds it half-up to `100.00` — which violates ADR-0010 B1's documented
bound `0 ≤ margin < 100`, now silently, in the database. `marginPct = '1.005'` is stored as `1.01`, a
rounding the ADR says must happen once, server-side, under application control (B4) — here it happens
in the column. `rate = '0.0010000000001'` (13 dp) is silently rounded to 8 dp. A non-numeric
`marginPct = 'one'` reaches the database and fails with SQLSTATE `22P02 invalid input syntax`, again as
a raw error rather than a coded `400`. The single-rounding-step invariant that `money.ts` protects
carefully does not extend to the two fields that are also stored as `numeric`.

**Recommended approach.** Give `rate` and `marginPct` the same treatment as the amounts: either a
`Money`-style validated decimal (they are not `Money` — no asset — so a small `Decimal` value object or
a `Money.round`-equivalent for a fixed scale), or explicit domain validation of the string
(well-formed decimal, within `[0, 100)` for margin, within the column scale for rate) so the failure is
a coded `400` and the stored value is the value the seller set. If validation is added, add the
matching `CHECK` in a `--create-only` migration per `AGENTS.md:45`/`:49`.

### F-5 — Medium — the paginator's total-order contract is documented but not enforced

`apps/api/src/common/pagination/cursor-pagination.ts:21-26` and `:46-52`

`CursorOptions<T>` says "Total, stable ordering" and `cursorOf` returns "the tie-breaking id", but
nothing checks that `compare` actually breaks ties on a unique key, nor that `compare` and `cursorOf`
agree on the sort key's representation. The spec happens to satisfy it
(`cursor-pagination.spec.ts:34-38`: `compare` falls back to `b.id.localeCompare(a.id)` and `cursorOf`
returns `{k: createdAt, i: id}`), so the tests pass; a caller that omits the id fallback is not
detected.

**Worked counter-example.** A caller sorts by timestamp only:
`compare: (a, b) => b.createdAt.localeCompare(a.createdAt)` with `cursorOf: (i) => ({k: i.createdAt,
i: i.id})`. Two offers share `createdAt = T`. Page 1 (limit 1) sees input order `[x, y]`; the stable
sort keeps `[x, y]`; it returns `x` and `nextCursor = {T, x}`. The next request's rows arrive as
`[y, x]` (row order is not guaranteed across queries); the stable sort keeps `[y, x]`; `findIndex`
matches `{T, x}` at index 1, so `start = 2` and the page is empty. Offer `y` is skipped permanently.
With the id fallback in `compare`, page 2 sorts `[x, y]`, resumes after `x`, and returns `y`. JS's
sort stability (guaranteed since ES2019) makes the bug intermittent rather than obvious: it depends on
the input order, which the DB does not promise.

**Recommended approach.** Enforce the contract where the ordering is defined rather than trusting it:
make the id tie-break part of the shared helper (e.g. accept a single `sortKey: (item) => string` plus
`id: (item) => string` and build both `compare` and `cursorOf` from them, so they cannot diverge), or
have `paginate` assert during development that adjacent equal-key items are ordered by `i`. This is
cheap and removes a silent-data-loss class of bug.

### F-6 — Low-Medium — the spatial predicate mixes a `geography` literal with a `geometry`-mapped column; index usage is unverified and WHERE order is not execution order

`apps/api/src/markets/domain/market-predicate.ts:107-121`, ADR-0023, `apps/api/src/markets/adapters/out/postgis-offer-query.ts:44-51`

The predicate is:

```sql
offers.market_id = $1 AND
ST_DWithin(offers.location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
```

This is well-constructed as *safety*: the market predicate is always present, the proximity predicate
can only appear beside it, every value is bound (`$1`–`$4`), and `ST_MakePoint($2, $3)` is
`(longitude, latitude)` in the correct order. Three things about it are not settled by the code:

1. **Type of `offers.location`.** ADR-0023 says spatial columns use the `Unsupported("geometry")`
   mapping, but the predicate casts the *literal* to `geography` and leaves the column unqualified.
   If the column is `geometry(Point,4326)`, the call is `ST_DWithin(geometry, geography, double)`,
   which PostGIS resolves only by casting the column's geometry to geography per row. That cast is not
   an indexed expression, so the GiST index on the geometry column would not serve the filter and the
   plan would likely be a sequential scan. The `offers` table does not exist yet (only
   `offer_terms_versions` does — see `find apps/api/prisma`), so this cannot be checked today.
2. **Where the index is.** No GiST index is declared anywhere in `apps/api/prisma` (grep for `GiST`,
   `USING GIST`, `geography` returns nothing but a comment), which is expected because the table has
   not landed. ADR-0023 requires one; it is not yet present.
3. **"The market predicate sits before the expensive work."** In PostgreSQL a `WHERE` is declarative;
   the textual order of `market_id = $1 AND ST_DWithin(...)` does **not** determine execution order.
   The co-location guarantees correctness (no out-of-market offer), not that the market filter runs
   first. Whether it does is the planner's choice, driven by selectivity and available indexes.

**What I would check with `EXPLAIN ANALYZE`** (once the `offers` table and its index exist, on
representative data — remembering it executes the query):

- `EXPLAIN (ANALYZE, BUFFERS) SELECT o.id, ST_Distance(o.location, ST_SetSRID(ST_MakePoint($2,$3),4326)
  ::geography) AS distance_meters FROM offers o WHERE o.market_id = $1 AND ST_DWithin(o.location,
  ST_SetSRID(ST_MakePoint($2,$3),4326)::geography, $4) ORDER BY distance_meters ASC, o.id ASC LIMIT $5`
  with realistic `market_id`, point, and radius.
- Whether the plan contains `Index Scan using <…>_gix` or `Bitmap Index Scan on <…>_gix` for the
  spatial predicate, or a `Seq Scan` with `ST_DWithin` as a filter. A `Seq Scan` here means the index
  is not being used and the type mismatch in (1) is the likely cause.
- Whether the market filter appears as an `Index Cond`/`Bitmap Index Scan` on `offers(market_id)` and
  is combined with the GiST scan via `BitmapAnd`, or is just a filter after the spatial scan. If the
  market is not selective this is fine; if it is, a `(market_id)` index (possibly partial on active
  offers) lets the planner intersect the two.
- The `Sort` node: `ORDER BY distance_meters` is an `ST_Distance` expression, so it forces a sort of
  the filtered set. If distance ordering dominates, `ORDER BY o.location <-> <point>::geography` uses
  the GiST index for a distance-ordered scan and removes the sort — but note the `<->` KNN ordering and
  `ST_Distance` ordering must be shown to agree, and the keyset tie-break (`o.id ASC`) still applies.

**Recommended approach.** Declare the location column as `geography(Point,4326)` (so the predicate's
`::geography` literal and the column agree and the GiST index is directly usable), add
`CREATE INDEX … USING GIST (location)` in the migration that introduces the table, and add a
`(market_id)` index for the market predicate. Then verify the plan as above before calling the query
optimised, per `AGENTS.md:54`. Do not change the predicate's structure or parameterization: those are
correct.

### F-7 — Low — `toPrismaSql`'s unsafe-text regex is defence in depth, not the injection control

`apps/api/src/markets/adapters/out/postgis-offer-query.ts:57, 68-88`

`toPrismaSql` splits the fragment on `$n`, binds placeholders via `Prisma.sql\`${value}\``, and emits
the remaining text through `Prisma.raw` after rejecting `'`, `"`, `;`, `\`, and `--`
(`UNSAFE_FRAGMENT_TEXT = /['";\\]|--/`). That denylist would not stop a fragment like
`offers.id = 1 OR 1 = 1`, which contains none of those characters. The function is safe **by
construction** because the only producer of a fragment is `buildOfferSpatialWhere`, whose identifiers
come from a frozen allowlist and whose values are all placeholders. The regex is a second line of
defence that reads more like the primary control than it is.

**Recommended approach.** Leave the function as it is — the allowlist is the control and it is correct
— but make the comment say so plainly (it already hints at it at `:53-56`), and if the fragment type
ever gains a second producer, revisit. No change needed today; noted so the regex is not mistaken for
sufficient on its own.

### F-8 — Low — refresh-token rotation is deliberately not idempotent, which is a client-retry hazard

`apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts:546-571`,
`apps/api/src/auth/application/session.service.ts:45-72`

`rotateSession` is a correct compare-and-swap: exactly one concurrent refresh can revoke the presented
token, and any loser triggers whole-family revocation as replay detection (`:566-572`). The
consequence is that a *legitimate* second attempt with the same refresh token — a client that retries
after a timeout, or two tabs refreshing at once — revokes the family and logs the user out. This is the
intended security trade-off (reuse detection is worth a false positive), and the algorithm is right;
it is called out only because "idempotency under retry" was in scope and the honest answer is that
this operation is intentionally not idempotent. The mobile client should treat a failed refresh as
"session over", not as retryable. No code change recommended; a one-line note in the auth flow doc
would prevent a future retry wrapper from being added.

### F-9 — Complexity note — the remaining O(n) work is fine and should be left alone

For completeness, the other non-constant costs, and why they are not worth changing at MVP scale:

- `resolveAgreementTerms` — `versions.find(...)` is O(h) in the offer's version history
  (`agreement-terms.ts:40`). `h` is the number of material edits to one offer, a handful over the
  offer's life. A map keyed by id would be O(1) but would duplicate state the DB already indexes; the
  DB lookup is by primary key, so the in-memory `find` is the right shape for the domain helper.
- `appendVersion` — `[...versions, version]` copies the history on each edit, O(h) per edit
  (`offer-terms-version.ts:111`). Immutability is the point; `h` is tiny. Leave it.
- `SPATIAL_SORT_OPTIONS.includes` and `PAIR_IDS`/`Object.keys` — O(1)-ish constant-size allowlists
  (`postgis-offer-query.ts:37`, `catalog.ts:101-103`). Leave them.
- `findByIdentifier`'s `OR` over `usernameNormalized`/`emailNormalized`
  (`prisma-identity.repository.ts:94-102`) is a `BitmapOr` over two partial unique indexes — indexed,
  not a scan. Leave it.

The one place where the asymptotics genuinely matter before scale is F-1, because it is a *shared*
contract and will be copied into the SQL adapters.

## Already correct — leave alone

These are deliberate, correct choices. They are listed so this report is not read as a demand to
rewrite everything.

- **Frozen catalog lookups** (`catalog.ts:72-124`). `PAIRS` is a frozen `Record<PairId, Pair>`; `getPair`
  is an O(1) property read; `PAIR_IDS` is computed once at module load. Crucially, `isPairId` uses
  `Object.hasOwn(PAIRS, value)` (`:115`), not `value in PAIRS` — the latter would return `true` for
  `'toString'`/`'constructor'` via the prototype chain and let an attacker pass a prototype key into
  `getPair`. This is right by construction.
- **Money as an exact integer in `bigint`** (`money.ts:59-133`). No binary floating point touches a
  monetary value; a JS `number` is refused outright (`:38-47`); `Money.of` rejects anything that
  cannot be represented exactly rather than truncating (`:75-80`); `Money.round` is the single
  rounding step, half-up away from zero, and idempotent (`:91-107`); `add` refuses mismatched assets
  (`:126-133`); `toDecimalString` normalises to exactly the asset's scale (`:110-120`). Half-up is a
  sound, conventional commercial rounding rule for VES/USD/USDT; the ADR fixes the scale and the
  single-step rule but not the tie rule, which is an implementation choice the comment documents.
  `bigint` is the right representation — the alternative (string arithmetic) would be slower and more
  error-prone for no gain.
- **The half-open quote window** (`quote.ts:13, 54-80`). `validUntil = now + 15 min` and
  `confirmQuote` rejects `at >= validUntil` (`:70`), so validity is exactly `[createdAt, validUntil)`.
  The spec pins the boundary at exactly `validUntil` (`quote.spec.ts:66-73`). Epoch-millisecond
  arithmetic makes the window exact; there is no off-by-one.
- **Compare-and-swap guards for auth** (`prisma-identity.repository.ts`). `consumeAuthChallenge`
  (`:294-304`), `completePasskeyRegistration`/`completePasskeyEnrollment` (`:240-263`, `:274-291`),
  `completeEmailVerification` (`:341-350`), `resetPassword` (`:398-407`), and `rotateSession`
  (`:546-558`) all put the guard in the `updateMany` `WHERE` and read success as `count > 0` — genuine
  atomic consumption, not read-then-write. `updatePasskeyCounter`'s `GREATEST(signature_counter, $1)`
  (`:179-184`) is likewise atomic and is exactly the right guard for WebAuthn counter rollback. The
  exception is F-2.
- **Stable `ORDER BY` with an id tie-break** (`postgis-offer-query.ts:44-51`). Both `distance` and
  `recent` append `offers.id ASC`, which is the tie-break that makes the keyset cursor well-defined.
  This is the right half of the contract F-5 asks to enforce.
- **Parameterized spatial SQL with a frozen identifier allowlist** (`market-predicate.ts:101-127`,
  `postgis-offer-query.ts:65-89`). Values are bound, identifiers come from `OFFER_SPATIAL_IDENTIFIERS`,
  the SRID is a constant, and `ST_MakePoint($2, $3)` passes `(longitude, latitude)` in the correct
  order. The market predicate is structurally welded to the proximity predicate, so no builder can
  emit proximity without market scope.
- **The page-size cap** (`cursor-pagination.ts:33-38`). `resolvePageLimit` clamps to `MAX_PAGE_SIZE`
  and falls back to the default for a missing, non-integer, or sub-1 limit, so no client can request
  an unbounded read.
- **The pagination slice arithmetic** (`cursor-pagination.ts:67-76`). `slice(start, start + limit)` and
  `hasMore = start + limit < ordered.length` are correct at every boundary: exactly `limit` remaining
  yields `hasMore = false`, a cursor on the last item yields an empty final page and a `null` cursor,
  and the spec's three-page walk of five items at size two confirms it (`cursor-pagination.spec.ts:66-84`).
  The bug in this module is F-1's row-reference resolution and F-5's unenforced tie-break, not the
  boundary math.
- **Opaque, re-validated cursors** (`cursor.ts:22-47`). `base64url` keeps the payload out of the
  client's way by convention, and `decodeCursor` re-validates the shape and raises a coded
  `INVALID_CURSOR` on anything malformed, so a tampered cursor is a `400`, not a crash or a silently
  different page. (Base64 is encoding, not encryption — the opacity is a contract, and the code treats
  it as one.)
- **Index coverage for the identity hot paths** (`schema.prisma:48-50, 68, 76, 85-86, 102, 118, 134`).
  Partial unique indexes on the normalised identifiers, a unique index on `refresh_token_hash`, and
  composite indexes on `(userId, revokedAt)`, `(tokenFamilyId, revokedAt)`, and the challenge/token
  lookup columns mean the auth CAS statements seek rather than scan. This matches `AGENTS.md:53`'s
  "indexes that support real, frequent, or critical queries".
