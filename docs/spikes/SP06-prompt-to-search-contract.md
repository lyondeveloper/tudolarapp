# SP06 — Design the prompt-to-search contract and UX

## 1. Task and acceptance criteria

Quoted from the backlog (`/tmp/backlog2.md`, §"SP06 — Design the Prompt-to-Search Contract and UX"):

> **Suggested owner:** Applied AI + search backend + product. **Depends on:** T00; independent spike, parallelizable.
> - Define the closed search-criteria schema for pair direction, amount, payment method, and location/radius; specify when the app asks for clarification.
> - Keep the active node from app context; never let a prompt change it. The backend applies the same deterministic search as manual filters; the LLM does not generate SQL, calculate prices, or rank offers.
> - Define no-results behavior that may adjust filters/radius only within the active node.
>
> **Acceptance criteria:** a prompt test set covers clear, ambiguous, unsupported-pair, out-of-node, no-GPS, adversarial, and no-result cases; expected user prompts and backend filters are documented.

## 2. Evidence and sources

### Observed (verified in this checkout)

- **The LLM may only parse text into typed criteria — never SQL, monetary rules, or ranking.** `AGENTS.md:11`, `AGENTS.md:52`, `docs/architecture.md:52`, `openspec/config.yaml:30-31`, and `README.md:20`. These are requirements, not options.
- **The active market is app context; the LLM cannot switch markets.** `AGENTS.md:9`, `docs/architecture.md:48`, `README.md:27`. "a location hint parsed from text does not silently switch markets" (`docs/architecture.md:48`).
- **A market is a geographic scope, not a city-name string, and is queried with PostGIS.** `AGENTS.md:9`, `docs/architecture.md:47`, `openspec/config.yaml:26`.
- **An existing, illustrative parser contract already exists.** `docs/flows/search-and-contact.md:33-47` shows `intent`, `action`, `payment_method_offered`, `payment_method_wanted`, `amount`, `location_hint`, `max_distance_km`, and states the backend "validates fields/enums, resolves the area, confirms ambiguity, and ensures the area is within the selected market before building parameterized SQL scoped to that market and using PostGIS for proximity. If a location hint points to another market, ask the user to switch or clarify rather than silently searching there."
- **The search flow already names the ambiguity gate and the empty state.** `docs/flows/search-and-contact.md:9-17`: Validate → `Certain{Is interpretation clear?}` → No → "Show interpreted filters for correction/confirmation"; and `Found{Any active offers?}` → No → "Empty state / broaden radius or adjust filters".
- **The manual-filter path and the parsed path converge on one query.** `docs/flows/search-and-contact.md:8,14` (`Criteria --> Query`) and `docs/flows/search-and-contact.md:13` (`Parse --> Validate --> Query`).
- **The parser is an infrastructure adapter behind a port.** `docs/architecture.md:46,52` ("PostgreSQL, WebAuthn, email, SMS, LLM, and maps adapters live in infrastructure"; "The LLM parses natural language into allowed JSON criteria. The backend validates and runs parameterized queries").
- **Deterministic search rules that bind the backend.** Parameterize values and never interpolate untrusted input (`AGENTS.md:44`); `ST_DWithin` + consistent SRIDs + GiST for proximity (`AGENTS.md:50`); stable ordering and pagination (`AGENTS.md:49`); strict DTO validation with `whitelist: true` and `forbidNonWhitelisted: true` (`AGENTS.md:71`).
- **Approved asset/rail vocabulary exists**: USD cash, USDT, Zelle, Venezuelan bolívars (`AGENTS.md:7`, `README.md:7`). The ten directional pairs, buyer's perspective, are enumerated for T01 (`/tmp/backlog2.md:110`).
- **The feature is unimplemented.** No market model, offers, or search exists; specs cover only mobile app-shell/design-system and the e2e foundation (`docs/audit/t00-baseline.md:208,211-217`; `openspec/specs/` listing). No search module exists under `apps/api/src/`.
- **UX tokens and test conventions that constrain the design.** Brand palette and token rules (`openspec/specs/mobile/design-system/spec.md:9-77`); how e2e scenarios are added (`docs/testing/e2e.md:56-72`) and what a handoff carries (`docs/testing/e2e.md:90-96`).

### Assumed / not verifiable (stated, not asserted)

- **No SP05, SP12, or other spike report exists yet** — `docs/spikes/` contains only `README.md`. Their decisions (market polygon, GPS behavior, model choice) are referenced here as **inputs this contract depends on**, not as settled facts. A search subagent claimed to read `SP12-llm-natural-language-search.md`; that file does not exist, so nothing from it is used.
- **The exact enum members** for pair direction, payment method, and asset are **not fixed here** — they are SP01's deliverable. The shapes below are proposed; the vocabulary is borrowed from the approved asset list and T01's catalog.
- **Amount limits, rounding, minor units, and the default radius** are SP02/SP05 decisions and are deliberately left as parameters.
- **The maps/geocoding provider is TBD** (`docs/architecture.md:40`).

## 3. Options considered

### Option A — Closed, flat criteria schema (kept)

One allowlisted object with enum-constrained fields, nullable when unspecified.

- **Pros:** simplest to validate (whitelist + reject unknown keys); one schema version to evolve; mirrors the illustrative contract in `docs/flows/search-and-contact.md`; easy to treat as untrusted input.
- **Cons:** nullable fields require an explicit "is it ambiguous?" signal to distinguish "not mentioned" from "could not resolve".
- **Decision:** **kept.** It satisfies "closed schema" directly and matches the existing documented shape.

### Option B — Discriminated union keyed by intent (partially kept)

A tagged union (`search_offer`, `unsupported`, `needs_clarification`) with per-intent bodies.

- **Pros:** encodes non-search outcomes explicitly instead of via nullable fields; the `unsupported`/`needs_clarification` cases from the acceptance criteria become first-class.
- **Cons:** more surface for the model to get wrong; two schemas to version.
- **Decision:** **partially kept** — the top-level `intent` discriminator is retained, but a full union is rejected for MVP to keep the closed schema small.

### Option C — Free-form JSON filtered by a backend whitelist (rejected)

Let the model emit loose JSON and drop unknown keys server-side.

- **Pros:** tolerant of model variation.
- **Cons:** "drop unknown keys silently" hides injection attempts and makes the closed contract unenforceable; contradicts `AGENTS.md:71` (`forbidNonWhitelisted`). 
- **Decision:** **rejected.**

### Option D — Let the model emit a price, a rate, or a sort order (rejected — hard limit)

- **Pros:** would let the model "help" with ranking.
- **Cons:** violates `AGENTS.md:11,52` and `docs/architecture.md:52`: the model must never own monetary rules or deterministic ranking, and must never compute prices/rates.
- **Decision:** **rejected outright.** The schema carries **no** price, rate, market id, SQL, or sort/rank field.

### Option E — Ambiguity policy: always-confirm vs. confidence-gated vs. never-confirm

- **Pros of always-confirm:** safest, no wrong query is ever auto-run.
- **Pros of confidence-gated:** fewer taps for clear prompts, matching the `Certain?` gate in `docs/flows/search-and-contact.md:10`.
- **Cons of never-confirm:** contradicts the documented flow and risks silently wrong searches.
- **Decision:** **confidence-gated, with a mandatory confirmation when a required field is unresolved.** The threshold itself is a product decision (§5).

### Option F — Out-of-market location: hard reject vs. offer switch vs. silently fall back to whole market

- **Pros of hard reject:** never wrong.
- **Cons:** dead end with no recovery.
- **Pros of offer switch:** matches "ask the user to switch or clarify" (`docs/flows/search-and-contact.md:47`).
- **Cons of silent fallback:** silently ignores the user's intent and can search a place they did not mean.
- **Decision:** **offer switch or explicit in-market fallback; never silent.**

## 4. Recommendation

### 4.1 Closed criteria schema (parser output)

The parser emits exactly one object; every key is allowlisted and every enum member comes from SP01's catalog. No other key is accepted.

```jsonc
{
  "intent": "search_offer",            // enum: search_offer | unsupported
  "direction": {                        // buyer's perspective; null if unresolved
    "give":    "ZELLE",                 // enum from SP01 (assets/rails)
    "receive": "USD_CASH"               // enum from SP01
  },
  "amount": { "value": 50, "asset": "USD_CASH" },  // null if not stated; NO rate
  "location": { "hint_text": "Intercomunal Avenue, Ciudad Ojeda", "radius_km": 5 },
  "unresolved": ["amount"],             // which fields the parser could not settle
  "confidence": { "direction": 0.9, "amount": 0.4, "location": 0.8 }
}
```

Hard exclusions (the closed-schema invariant): **no** `price`/`rate`, **no** `market_id` or market name, **no** `sql`/query text, **no** `sort`/`rank`/`order`, and **no** seller-identity fields. `amount.value` is a bare number plus the SP02-defined asset/scale; the contract never converts currencies or applies a rate.

### 4.2 Backend validation pipeline (deterministic)

1. **Transport validation** — inbound DTO with `whitelist: true`, `forbidNonWhitelisted: true` (`AGENTS.md:71`). The parser output is untrusted input.
2. **Closed-schema check** — reject unknown keys and any enum value outside SP01's catalog; reject `price`/`rate`/`sort` keys if present (defence against a model that tries to add them).
3. **Domain validation** — a `SearchCriteria` value object in `domain/` enforces invariants (a direction from the approved catalog, positive amount, radius within bounds). No NestJS/Prisma imports (`AGENTS.md:56`).
4. **Amount checks** — min/max/rounding against SP02's rules, not invented here.
5. **Location resolution** — geocode `hint_text` through a maps port (provider TBD) to a point.
6. **Market containment** — verify the point is inside the active market polygon with PostGIS; the active market id comes from app context, never from the prompt (`AGENTS.md:9`).
7. **Deterministic query** — the **same** `SearchOffers` use case that manual filters call builds parameterized `$queryRaw` with `ST_DWithin` scoped to the market (`AGENTS.md:44,50`), with backend-owned stable ordering (`AGENTS.md:49`). The model never touches this step.

### 4.3 Ambiguity and confirmation

- The parser returns `unresolved[]` and per-field `confidence`.
- The app **must** ask for clarification when a **required** field is unresolved. Required = direction. When GPS is unavailable, a location or an explicit in-market hint is required (see SP05, `/tmp/backlog2.md:62`).

> **Correction — `docs/adr/0002-search-location-is-optional.md` (spike-interface-reconciliation).** The
> sentence above is wrong and is corrected here rather than rewritten. **Location is optional**, and it
> is **not** required when GPS is unavailable. When GPS is unavailable, denied, or outside the node,
> the search runs against the **whole active market** with no proximity filter — matching SP05, SP12,
> the backlog, and this report's own test #7 (§7 below), which already asserts it. Only `direction` is
> required; a location hint, when present, may only **narrow** results inside the active market. The
> original text is left visible above as evidence.
- When the direction resolves but `amount`, `location`, or `radius` is low-confidence, the app **must** show the interpreted criteria for correction/confirmation (`docs/flows/search-and-contact.md:11`) before querying.
- Direct query without a confirmation step is allowed only when every present field is high-confidence. The threshold value is a product decision (§5).
- Clarification is a question with tappable options (e.g. "Did you mean Zelle → USD cash, or Zelle → VES?"), never an open re-prompt loop.
- **Fallback:** if the parser errors, times out, or returns `unsupported`, the app keeps the text and offers manual filters (`docs/flows/search-and-contact.md:47`).

### 4.4 Parsed location outside the active market

- If the geocoded hint is **outside** the active market polygon, the backend **does not query** and returns an `outside_market` result.
- The user sees a notice naming the active market and two explicit choices:
  - **"Search all of {active market}"** — drops the hint, searches the whole node; this is the only widening allowed (`/tmp/backlog2.md:69`).
  - **"Change market"** — opens market selection, a **user** action. The LLM never switches markets (`AGENTS.md:9`).
- An in-market hint may **narrow** results but can never expand the node (SP05, `/tmp/backlog2.md:62`). An out-of-node hint cannot narrow, so it is either dropped with consent or rejected.
- Active GPS outside the node is SP05's behavior; SP06 reuses it rather than redefining it.

### 4.5 No-results behavior

- Empty state is rendered **inside** the active market (`docs/flows/search-and-contact.md:16`).
- The app may offer to widen the radius **up to the market boundary** and/or relax filters, each as an explicit user action. It never auto-relaxes and never queries outside the node (`/tmp/backlog2.md:69`).
- Manual filters remain available as the recovery path.

### 4.6 What the user sees (states)

| State | Trigger | What is shown |
| --- | --- | --- |
| Search entry | Home/search | Free-text field + manual-filters toggle; active market visible |
| Interpreted criteria | Free text parsed | Editable chips for direction, amount, location, radius; Search / Edit filters |
| Clarification | Required field unresolved / low confidence | One question with tappable options |
| Unsupported | `intent: unsupported` | "I can't search that"; manual filters offered |
| Outside market | Hint geocodes outside node | Notice + "Search all of {market}" / "Change market" |
| No results | Query returns nothing | In-market widen-radius / relax-filter actions |
| Parser failure | Error/timeout | Text preserved; manual filters offered |
| Loading / error | In flight / transport failure | Explicit loading and retryable error, per `AGENTS.md:88` |

UI is composed from gluestack tokens (`openspec/specs/mobile/design-system/spec.md:65-77`); monetary values render with tabular figures (`:60-63`).

### 4.7 Hard limits (restated)

The LLM **parses text into typed criteria only**. It never generates or executes SQL, never owns or computes monetary rules or rates, never chooses the market, and never determines ranking or ordering. Those remain in the domain/application and the parameterized PostGIS query (`AGENTS.md:11,52`; `docs/architecture.md:52`).

## 5. Unresolved decisions

| # | Decision | Owner |
| --- | --- | --- |
| U1 | Exact enum members and directional encoding for `direction` (the SP01 matrix) | SP01 / product owner |
| U2 | Amount limits, rounding, scale, and minor unit for `amount` | SP02 / product owner |
| U3 | Confidence threshold that switches confirmation → direct query | Product owner |
| U4 | Default radius and allowed radius bounds | SP05 + product owner |
| U5 | Whether the out-of-market state may offer "Change market" inline, or only link to market selection | Product owner |
| U6 | Whether no-results may auto-suggest a specific relaxation or only present options | Product owner |
| U7 | Model/provider, latency budget, cost, PII handling, and operational fallback | SP12 + security |
| U8 | The authoritative Ciudad Ojeda polygon/source | T01 (SP05) |
| U9 | Whether free-text parsing requires authentication | Product + security |
| U10 | Spanish/Venezuelan terms and typo handling | SP12 |
| U11 | Whether parsed criteria/prompts are logged or persisted, and retention | Product + privacy |

## 6. Product and technical impact

- **API:** a new `search` module under `apps/api/src/search/` with hexagonal layers — `domain/` (`SearchCriteria` value object, invariants), `application/` (`ParseSearchQuery` and `SearchOffers` use cases + ports), `adapters/in/http/` (controller + DTOs), `adapters/out/` (`SearchQueryParser` LLM adapter, `GeocodingPort` maps adapter, repository). No search module exists today (`docs/audit/t00-baseline.md:211-217`).
- **No schema change** is required by this contract alone; markets/offers tables arrive with T04/T07–T14. Any spatial column follows `AGENTS.md:42` (`Unsupported(...)` mapping + `$queryRaw`).
- **Mobile:** a `features/search/` area; RTK Query is the sole remote-state layer (`AGENTS.md:90`), React Hook Form for manual filters (`AGENTS.md:92`), gluestack components (`AGENTS.md:93`).
- **Security/privacy:** parser output is untrusted; no unnecessary PII sent to the model (`docs/flows/search-and-contact.md:47`); parameterized SQL only (`AGENTS.md:44`); no SQL/price/rank fields in the schema.
- **Testing:** new `apps/api/test/search.e2e-spec.ts` and a mobile flow under `apps/mobile/e2e/`, per `docs/testing/e2e.md:56-72`; scenarios below.
- **Process:** decisions accepted here fold into T01/T02 OpenSpec changes, not into this report (`docs/spikes/README.md:72-76`).

## 7. Testable scenarios

1. **Clear prompt.** WHEN the user types "necesito 50 dólares por Zelle" with the market active and GPS on, THEN the backend builds one in-market PostGIS query with direction Zelle→USD cash, amount 50, and the default radius, and returns matching offers.
2. **Ambiguous direction.** WHEN the prompt names an amount and location but not a direction, THEN the app asks one clarification question with tappable options and does not query.
3. **Ambiguous amount.** WHEN the direction resolves but the amount is low-confidence, THEN the interpreted criteria are shown for correction before any query.
4. **Unsupported pair.** WHEN the prompt asks for a pair outside the approved catalog, THEN `intent: unsupported` is returned and manual filters are offered; no query runs.
5. **Out-of-node location.** WHEN the location hint geocodes outside the active market polygon, THEN no query runs and the app offers "Search all of {market}" or "Change market"; the active market is unchanged by the prompt.
6. **In-node narrowing.** WHEN an in-market hint is provided, THEN results are narrowed within the node and never expanded beyond it.
7. **No GPS.** WHEN GPS is disabled or denied, THEN the search runs over the whole active node (or asks for an in-node hint) without leaving the node.
8. **No results.** WHEN a valid in-market query returns nothing, THEN the empty state offers widening the radius only up to the market boundary and relaxing filters, each as an explicit action.
9. **Adversarial — market switch.** WHEN the prompt says "search in Maracaibo instead", THEN the active market is not changed and the response is the out-of-market/unsupported path.
10. **Adversarial — SQL/price/rank injection.** WHEN the prompt asks for a rate, a computed price, a specific sort order, or emits SQL, THEN those keys are rejected by the closed-schema check and the deterministic backend ranking is used.
11. **Parser failure.** WHEN the parser errors or times out, THEN the raw text is preserved and manual filters are offered.
12. **Determinism.** WHEN the same criteria arrive via manual filters and via the parser, THEN both produce the identical query and result ordering.

## 8. Sources reviewed

- `AGENTS.md` (full, lines 1–116) — product context, PostgreSQL/PostGIS, hexagonal NestJS, React/RTK Query, security.
- `/tmp/backlog2.md` — SP06 (§65–70), T01 pair catalog and market rules (§106–115), SP02/SP05/SP12 boundaries.
- `docs/spikes/README.md` — the spike protocol.
- `README.md` — product context, MVP scope, market scope, implementation status.
- `docs/architecture.md` — responsibility boundaries, LLM parser placement, market scoping.
- `docs/flows/search-and-contact.md` — search flow, illustrative LLM contract, safety rules.
- `docs/flows/seller-offer-lifecycle.md`, `docs/flows/authentication.md` — market/offer and session context.
- `docs/testing/e2e.md` — scenario conventions and handoff requirements.
- `docs/audit/t00-baseline.md` — verified current state; unimplemented search/market/offers.
- `openspec/config.yaml` — planning rules and the LLM-only-parses constraint.
- `openspec/specs/mobile/design-system/spec.md`, `openspec/specs/mobile/app-shell/spec.md` — UX/token constraints.
- `openspec/specs/testing/e2e-foundation/spec.md` — e2e foundation (referenced).
- `docs/spikes/` directory listing — confirmed no SP05/SP12 reports exist yet.
