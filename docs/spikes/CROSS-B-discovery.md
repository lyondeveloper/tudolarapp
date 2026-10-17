# Cross-check B — DISCOVERY: how a buyer finds an offer

Analysis only. No application code, schema, or migration was changed; no file other than this one was
written. This document cross-checks four reports that were written **in parallel and did not read each
other** (`SYNTHESIS.md:58-73` names this as the batch's one remaining gap):

- `SP05-market-geofences-location-privacy.md` (owns the market predicate)
- `SP06-prompt-to-search-contract.md` (owns the closed criteria schema)
- `SP12-llm-natural-language-search.md` (owns the parser that must emit SP06's schema)
- `SP10-mvp-scope-pilot-metrics.md` (owns the funnel events that must be derivable from the others' states)

It does not restate them. Every claim below cites the file and line it comes from.

Fixed constraints treated as given (product owner): **(a)** Zelle is out of the MVP — five pairs remain
(VES → USDT, VES bank → VES cash, VES → USD cash, USDT → VES, USDT → USD cash); **(b)** E2E stays
local-only, so the mobile suite joins no CI or launch gate; **(c)** the daily earnings bucket uses
market-local time (America/Caracas). Where these invalidate a report, §6 says so.

## 1. Agreements (independently reached — the strongest signal here)

**A1 — The model parses text only; the backend owns money, ranking, and market scope.** SP06 states it
as a requirement, not an option: `SP06:18` — "The LLM may only parse text into typed criteria — never
SQL, monetary rules, or ranking." SP12 reaches the same boundary independently and lists it as
non-negotiable: `SP12:75` — "The model: (1) never generates or executes SQL … (2) never owns monetary
rules … (3) never determines ranking … (4) never chooses or switches the market." Two reports, one
rule.

**A2 — The active market comes from app context; a prompt can narrow it but never switch or expand it.**
`SP05:181-185` — "A fix outside the node never expands it … An explicit, in-node location … may also
narrow results but is clamped to the node." `SP06:130` — "'Change market' — opens market selection, a
**user** action. The LLM never switches markets." `SP12:75` (item 4) — the model's `location_hint`
"may only narrow, never expand or move." Three-way agreement.

**A3 — Out-of-node location: no query runs; the user is asked to switch or clarify; never silent.**
`SP05:146-148` (rejects "silently expand … or search the nearest market"), `SP06:127-131` (returns
`outside_market`, offers "Search all of {market}" / "Change market"), `SP12:148` (test: "the user is
asked to switch market or clarify; the active market is unchanged"). Agreement.

**A4 — GPS denied/unavailable ⇒ search the whole active node (no proximity filter), not an error.**
`SP05:181-183` — "Without a fix or without permission, the search returns the whole node." `SP06:192`
(test #7) — "THEN the search runs over the whole active node … without leaving the node." `SP12:95`
(fixture) and `SP12:149` (test) — "Search the whole active node." Agreement — and it is the backlog's
own rule (`/tmp/backlog2.md:62`, "without GPS/permission, search the entire active node").

**A5 — Parsed and manual criteria converge on one deterministic query; there is no second query
builder.** `SP06:114` — "the **same** `SearchOffers` use case that manual filters call … The model never
touches this step." `SP06:197` (test #12, "both produce the identical query and result ordering").
`SP12:74` — "passed to the **same** search use case that manual filters use. There is no second query
builder." `SP10:101-102` — "NL search is an interpretation layer on the same deterministic path."
Agreement.

**A6 — The parser is an infrastructure adapter behind a port; the provider secret stays server-side.**
`SP06:177` — "`SearchQueryParser` LLM adapter" under `adapters/out/`. `SP12:72` — an `IntentParserPort`
"following `apps/api/src/auth/adapters/out/` and the `Unavailable`/config-selected pattern … The key
stays server-side." Agreement.

**A7 — Market scope is a mandatory predicate, not an optional filter.** `SP05:175-178` — "an offer is
returned only when `ST_Covers(market.boundary, offer.location)` and `offer.market_id` equals the active
market … the only construction under which 'no query can return an out-of-node offer' holds."
`SP06:113` — "verify the point is inside the active market polygon with PostGIS; the active market id
comes from app context, never from the prompt." `SP10:52-54` — "Every search is scoped to the selected
market polygon via PostGIS." Agreement.

**A8 — Parser output is untrusted and is re-validated before it reaches the query.** `SP06:108-110`
(transport validation, closed-schema check, domain value object). `SP12:103` — "The parser is an
untrusted input source; nothing it returns reaches the query without passing the same deterministic
gate manual input passes." Agreement.

**A9 — No user's coordinates are ever exposed to another user.** `SP05:187-190` — "the API returns
approximate distance bands or meeting areas, never coordinates or addresses." `SP06:180` — "no
unnecessary PII sent to the model." `SP10:274` (test) — "the reporter's identity is not exposed to the
subject." Agreement in spirit.

**A10 — Manual filters are the universal recovery path.** `SP06:123` (parser fallback), `SP06:138`
("Manual filters remain available as the recovery path"), `SP12:78` ("failing that, to manual
filters"), `SP10:101-102` ("Manual search … satisfies the funnel"). Agreement.

## 2. Conflicts

**C1 — Is a location required when GPS is unavailable? SP06 says yes; SP05, SP12, and the backlog say
no.**
- SP06 side: `SP06:119` — "Required = direction. When GPS is unavailable, a location or an explicit
  in-market hint is required (see SP05, `/tmp/backlog2.md:62`)."
- The other side: `SP05:181-183` — "Without a fix or without permission, the search returns the whole
  node." `SP12:95` and `SP12:149` — "Search the whole active node." Backlog `line 62` — "without
  GPS/permission, search the entire active node."
- **Judgement: SP06 is wrong, and it is self-contradictory.** Its own test #7 (`SP06:192`) says the
  search "runs over the whole active node (or asks for an in-node hint)" — optional, not required.
  SP06:119 makes location mandatory and even cites the backlog line it contradicts. The whole-node rule
  is the fixed behavior; location is never required. This is a must-fix before T02.

**C2 — The parser architecture: one LLM call (SP06's model) vs. rules-first with an LLM only for the
residual (SP12's recommendation).** SP06 never considers a deterministic first stage; its schema is
built around a single LLM parse that emits per-field `confidence` floats (`SP06:100`) and its parser
state is "Parser failure → manual filters" (`SP06:150`). SP12's recommendation is the opposite order:
`SP12:63-64` — "The deterministic parser resolves the common cases; only unparsed/ambiguous text is
sent to the hosted model … **Kept** as the recommendation," and `SP12:61` makes the rules parser "the
mandatory fallback." **Judgement: SP12's hybrid is correct and SP06's contract must accommodate it.**
The reasons are SP12's own: cost, latency, and PII exposure are cut to the hard cases, and the product
must work offline (`SP12:115`). But this is a real conflict, not a merge: SP06's schema has no field to
say *which* stage produced a value, and a rules stage cannot naturally emit a `confidence` float. See
interface mismatch **I1**.

**C3 — Who owns the default search radius.** `SP06:166` (U4) assigns it: "Default radius and allowed
radius bounds | SP05 + product owner." But `SP05:98-99` disclaims it: "Exact retention durations,
coordinate precision, **default radius**, and GPS-accuracy thresholds are product/legal decisions;
nothing in the repository fixes them." **Judgement: SP06's assignment is wrong** — SP05 owns the market
*predicate*, not the radius policy, and it explicitly hands the default to the product owner. Neither
report owns it; it is a gap (**G1**), not a conflict of substance.

**C4 — SP10 defers the whole natural-language layer that SP06/SP12 exist to specify.** `SP10:101-102`
(B2) removes "Natural-language search (T11/SP12)" from the pilot gate, while SP06 and SP12 design it as
part of the search surface. **Judgement: not a hard conflict — a sequencing decision** — and SP10
reconciles it by keeping NL as "an interpretation layer on the same deterministic path" (agreed, A5).
But it has a concrete consequence: SP10's funnel is the durable event dictionary and it contains no
parser event, so SP12's mandated observability has no home (**I4**).

## 3. Interface mismatches

**I1 — SP12's parser must emit SP06's schema, but SP12 describes the OLD field names and a bare
number.** SP06 owns the closed schema:
```
SP06:92-100  intent; direction{give,receive}; amount{value,asset}; location{hint_text,radius_km};
             unresolved[]; confidence{direction,amount,location}
```
SP12 instead cites and depends on the pre-existing illustrative contract, whose names SP06 replaced:
`SP12:31` lists "`intent`, `action`, `payment_method_offered`, `payment_method_wanted`, `amount`,
`location_hint`, `max_distance_km`" as "the documented criteria example," and `SP12:106` requires
"`payment_method_offered`/`payment_method_wanted`/pair direction … members of the SP01 catalog." SP06
dropped `action`, renamed the pair to `direction{give,receive}`, `location_hint` → `location.hint_text`,
`max_distance_km` → `location.radius_km`, and changed `amount` from a number to `{value, asset}`. SP12's
own amount rule is a bare number: `SP12:107` — "The amount must be a positive number … the model
extracts a number and never a rate." **Mismatch:** SP12's adapter cannot emit SP06's `amount.asset`,
and it names three fields SP06's schema rejects (`forbidNonWhitelisted`, `SP06:108`). SP12 does concede
the authority (`SP12:73`, "The schema is owned by SP06; the enum values by SP01"), but its concrete
field references are stale and must be rewritten to SP06's names.

**I2 — SP12 needs a "cannot parse" outcome that SP06's enum does not have.** `SP12:70` — the parser
output is "the closed criteria object **or an explicit 'cannot parse'**"; `SP12:78` treats "unparseable
output" as a distinct case. SP06's `intent` enum is only `search_offer | unsupported` (`SP06:92`), where
`unsupported` means an out-of-catalog *pair* (`SP06:189`), and parser failure is handled out-of-band as
"Parser failure → manual filters" (`SP06:150`), not as a schema value. **Mismatch:** there is no enum
member SP12 can emit for "cannot parse."

**I3 — SP06 emits `radius_km`; SP05's predicate is in meters.** `SP06:98` carries
`"radius_km": 5`; `SP05:172` builds "`ST_DWithin(point, center, radius_meters)`" and `SP05:167-170`
uses the `geography` overload for "native meters." **Mismatch:** the km→meters normalization at the
parser→query boundary is specified by neither report (gap **G2**), and `SP10:152` records the event
property as `radius_km` too, so the unit must be pinned once.

**I4 — SP12's mandated parser observability has no event in SP10's dictionary.** `SP12:79` requires
logging "parse latency, chosen path (rules vs LLM), schema-validation pass/fail, escalation rate, and
fallback rate." SP10's dictionary has `search.performed` with only "market_id, filters_used, radius_km,
gps_state" (`SP10:152`) — no path/provenance, no parse outcome. **Mismatch:** SP12's fields are not
derivable from any state SP10 counts.

**I5 — SP10's `gps_state` property has no enum, and SP05 never defines one.** `SP10:152` names
`gps_state` as a `search.performed` property. SP05 defines the *behaviors* (granted-in-node,
granted-out-of-node fallback, denied, no-fix, explicit in-node hint; `SP05:179-185`) but publishes no
enum of values. **Mismatch:** the funnel event cannot be populated without an agreed `gps_state` enum
(gap **G3**).

**I6 — SP10's funnel cannot see a search that never reaches the query.** SP10's denominator
`search.performed` is "a search runs against a market" (`SP10:152`), but SP06 defines three pre-query
terminal states — clarification (`SP06:146`), unsupported (`SP06:147`), outside-market (`SP06:148`) —
that never run a query. **Mismatch:** the "Search success" metric `search.matched / search.performed`
(`SP10:168`) silently excludes every user blocked at clarification or outside the node, so SP10 cannot
measure the funnel SP06 defines.

**I7 — SP10's event shape does not match SP06's pair/asset shape.** `SP10:150` gives
`offer.published` the properties "market_id, **pair**, amount, **currency**" (singular). SP06's pair is
two-legged — `direction{give, receive}` with an asset per leg (`SP06:93-95`) — and a pair like
USDT → VES carries **two** assets. **Mismatch:** the event dictionary's `pair`/`currency` must adopt
SP06's two-leg `direction` shape or the funnel cannot key on a direction.

**I8 — SP06's market-containment step does not name SP05's boundary predicate, so it can silently
diverge.** SP06:113 says only "verify the point is inside the active market polygon." SP05 fixes the
predicate: `SP05:171` — "Boundary inclusion uses `ST_Covers(market.boundary, point)`, so a coordinate
exactly on the edge is inside," and rejects `ST_Contains` because it "rejects coordinates exactly on the
polygon edge" (`SP05:124-126`). **Mismatch:** if SP06's "inside" is implemented with `ST_Contains`, the
on-boundary case fails — and SP05's own acceptance criterion makes that a distinct tested case
(`SP05:235-236`). SP06 must inherit `ST_Covers` by name.

## 4. Gaps (owned by neither, or assumed owned by the other)

**G1 — Default radius and allowed radius bounds.** SP06 assigns them to "SP05 + product owner"
(`SP06:166`); SP05 disclaims them as a product/legal decision (`SP05:98-99`). Net owner: **product
owner.**

**G2 — km↔meters radius normalization.** Neither report converts; see **I3**. Owner: **technical lead
(T02 contract).**

**G3 — The `gps_state` enum.** SP05 defines behaviors, SP10 consumes a property; no enum exists (see
**I5**). Owner: **SP05 + technical lead.**

**G4 — The geocoding/maps provider is unowned.** `docs/architecture.md:40` says "Maps / geocoding
provider TBD"; SP06 calls it "TBD" (`SP06:112`); SP12 assigns it to SP05 (`SP12:136`, "Market polygon +
geocoding provider for resolving `location_hint`. **Owner: SP05**"). But SP05's report never claims the
geocoding provider and its U-table (`SP05:196-204`) does not list it. Owner: **product owner +
technical lead** (SP05 owns only the polygon).

**G5 — Parser/NL observability events** (SP12's path/schema-pass/escalation/fallback metrics) have no
event in SP10's dictionary (see **I4**). Owner: **SP12 + technical lead (T02).**

**G6 — Who records the parser-stage provenance (`rules` vs `llm`) on a search.** SP12 requires the
"chosen path" be logged (`SP12:79`) and SP06's confidence-gated flow depends on it, but SP06's schema
has no source field and SP10's event has none. Owner: **SP06 + SP12.**

**G7 — GPS-accuracy threshold that degrades a fix to whole-node search.** SP05 flags it as a product
decision (`SP05:183-185`, U8 at `SP05:203`); SP06 and SP12 never mention accuracy. Owner: **product
owner + technical lead.**

**G8 — Whether free-text parsing requires authentication, and whether parsed prompts/criteria are
logged or persisted (and retention).** SP06 raises both (`SP06:171` U9, `SP06:173` U11); SP12 covers
only the provider-side equivalent (`SP12:130` retention, `SP12:132` PII minimization) and recommends
"no raw user text by default" (`SP12:79`). Owner: **product + security/privacy.**

**G9 — Who validates `amount.asset` against the resolved direction.** SP06's `amount` carries an
`asset` (`SP06:97`) but never says how it is checked against the pair; SP12 describes amount as a bare
number with no asset (`SP12:107`). Owner: **SP06 + SP02.**

## 5. Consolidated open decisions (de-duplicated, re-keyed by decision — no report-local `Un` numbers)

Owners named; none is decided here. `SP05 Un`, `SP06 Un`, `SP10 U-n` are the reports' colliding local
ids and are deliberately not reused.

**Blocking T04 (geospatial) — highest priority**
1. **The authoritative Ciudad Ojeda polygon and its source/licence.** Raised independently by
   SP05 (U1, `SP05:196`), SP06 (U8, `SP06:170`), SP10 (U-9, `SP10:236`). Owner: **product owner
   (T01)**; `SYNTHESIS.md:79-82` calls it the highest-priority blocker.
2. **Final spatial type/SRID and the `Unsupported(...)` mapping.** SP05 U7, `SP05:202`. Owner:
   **technical lead (T02/T04).**

**Search/geofence policy**
3. **Default radius and allowed radius bounds** (gap G1). Owner: **product owner.**
4. **km↔meters normalization ownership** (gap G2). Owner: **technical lead (T02).**
5. **`gps_state` enum values** (gap G3). Owner: **SP05 + technical lead.**
6. **GPS-accuracy threshold that degrades to whole-node** (gap G7). Owner: **product owner +
   technical lead.**
7. **UX/copy when GPS is outside the active node** (prompt to switch vs whole-node). SP05 U3,
   `SP05:198`. Owner: **product owner.**
8. **Out-of-market UX: "Change market" inline or link-only.** SP06 U5, `SP06:167`. Owner: **product
   owner.**
9. **No-results: auto-suggest a specific relaxation or present options only.** SP06 U6, `SP06:168`.
   Owner: **product owner.**
10. **Geocoding/maps provider** (gap G4). Owner: **product owner + technical lead.**

**Parser / LLM**
11. **Confidence threshold that switches confirmation → direct query.** SP06 U3, `SP06:165`; note
    SP12's rules-first stage may moot it for rules-resolved fields (**C2**). Owner: **product owner.**
12. **LLM provider/model, latency budget, cost, data-processing terms, operational fallback.** SP06 U7
    (`SP06:169`); SP12 provider/model, retention, cost bullets (`SP12:129-133`). Owner: **Applied AI +
    product + security.**
13. **Rules-vs-LLM escalation boundary and minimum fixture pass rate.** SP12, `SP12:131`. Owner:
    **Applied AI + product.**
14. **PII-minimization rule** (what is stripped before a provider). SP12, `SP12:132`. Owner:
    **security + product.**
15. **Whether parsed criteria/prompts are logged or persisted, and retention** (gap G8). SP06 U11,
    `SP06:173`. Owner: **product + privacy.**
16. **Whether free-text parsing requires authentication** (gap G8). SP06 U9, `SP06:171`. Owner:
    **product + security.**
17. **Spanish/Venezuelan terms and typo handling.** SP06 U10 (`SP06:172`); SP12 hypothesis
    (`SP12:50`). Owner: **SP12 / Applied AI.**
18. **Parser-stage provenance field and the "cannot parse" outcome** (gaps G6, I2). Owner: **SP06 +
    SP12.**
19. **Funnel event shape: two-leg `direction` and asset-per-leg instead of singular `pair`/`currency`**
    (I7). Owner: **T02 contracts, with SP01/SP06.**

**Privacy**
20. **Location retention period, legal basis, and whether raw fixes are stored at all.** SP05 U4,
    `SP05:199`. Owner: **product owner + legal (SP08).**
21. **Precision/coarseness at which any stored location is kept.** SP05 U5, `SP05:200`. Owner:
    **product owner + technical lead.**
22. **Offer location granularity (neighborhood vs point) and who chooses it.** SP05 U6, `SP05:201`.
    Owner: **product owner (SP07).**

**Funnel / pilot**
23. **Pilot success/stop thresholds, evaluation window, minimum supply, seed size, final deferral
    list.** SP10 U-1…U-4, `SP10:223-228`. Owner: **product owner** (+ operations for supply).
24. **Whether a client analytics SDK is added at all** (needs an ADR). SP10 U-5, `SP10:229-230`. Owner:
    **product owner + technical lead.**

**Cross-cutting product scope (raised in this cluster, owned elsewhere)**
25. **Whether seller profiles and subscription billing are global or market-specific** — changes what
    "per-market supply" counts in the funnel. SP05 U2 (`SP05:197`), SP10 U-10 (`SP10:237-238`). Owner:
    **product owner (T01).**

## 6. Where the three fixed constraints invalidate a report

**(a) Zelle removed (five pairs remain).** The following named Zelle examples are now invalid and must
be rewritten to the surviving catalog:
- SP06's schema example uses Zelle as the give-leg — `SP06:94-95` (`"give": "ZELLE"`,
  `"receive": "USD_CASH"`); its headline scenario is "necesito 50 dólares por Zelle" (`SP06:186`); its
  clarification example is "Did you mean Zelle → USD cash, or Zelle → VES?" (`SP06:122`).
- SP12's entire fixture set is Zelle-heavy — `SP12:87` ("por Zelle"), `SP12:88`, `SP12:96`, and the
  headline test `SP12:146` ("necesito 50 dólares en efectivo por Zelle").
- SP10's seed requires Zelle↔USDT "so all four asset rails appear" — `SP10:201`. With Zelle gone, the
  five pairs still cover four rails (VES cash, VES bank transfer, USD cash, USDT on-chain); substitute
  a surviving pair (e.g. USDT → USD cash) so the intent survives.
- **Broader:** the `direction` enum SP06 borrows from SP01 shrinks from ten pairs to five, so every
  "unsupported pair" fixture (`SP12:93`) must be re-based on the five-pair catalog. (SP01's
  `ZELLE`-as-USD-rail analysis, `SP01:92`, becomes moot for the MVP; SP01's matrix rows 4–7 and 10 are
  dropped — flagged here because SP06/SP12's enums are downstream of it.)

**(b) E2E local-only.** This closes SP10's own open question — `SP10:234-235` (U-8, "Whether the mobile
Maestro suite joins the mandatory launch gate") is answered **no**. It also resolves SP05's U9
(`SP05:204`, "Whether GPS flows get device-level E2E coverage (no macOS runner yet)"): GPS device
coverage stays local, not in a CI/launch gate. No contradiction remains.

**(c) Daily earnings on market-local time (America/Caracas).** SP10 assumed this boundary would come
from SP11 — `SP10:77-78` ("the business day boundary and timezone for a 'pilot day' will come from
SP11") — and its Supply metric is "active offers per market per day" (`SP10:167`). The constraint now
fixes that boundary to America/Caracas, so SP10's "per day" metrics are comparable across sellers
without waiting on SP11. No report is invalidated; this fills an assumption.

## 7. Sources reviewed

- `docs/spikes/README.md` (protocol, hard rules), `AGENTS.md` (product context, PostGIS, hexagonal,
  RTK Query), `/tmp/backlog2.md` (SP05/SP06/SP10/SP12 briefs and T01).
- `docs/spikes/SP05-market-geofences-location-privacy.md`, `SP06-prompt-to-search-contract.md`,
  `SP12-llm-natural-language-search.md`, `SP10-mvp-scope-pilot-metrics.md` — read in full.
- `docs/spikes/SP01-exchange-pairs.md` (enum/catalog owner), `docs/spikes/SYNTHESIS.md` (prior
  reconciliation), `docs/flows/search-and-contact.md` (the illustrative contract both SP06 and SP12
  cite), `docs/architecture.md` (responsibility boundaries, maps provider TBD).
