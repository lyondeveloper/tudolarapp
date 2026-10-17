# SP10 — Define MVP Scope, Pilot Metrics, and Release Gates

> Research only. This report proposes; it does not decide. Every threshold, scope cut, and seed
> volume below is a **candidate** for the product owner, and every one is repeated in
> §5 Unresolved decisions. No product rule, monetary rule, market boundary, or business invariant is
> invented here.

## 1. Task and acceptance criteria

Quoted from the backlog (`/tmp/backlog2.md`, lines 87–91):

> ### SP10 — Define MVP Scope, Pilot Metrics, and Release Gates
> **Suggested owner:** Product + QA + operations. **Depends on:** T00; independent spike, parallelizable.
> - Define the minimum testable pilot flow for one market, the features explicitly deferred, seller-supply readiness, support readiness, and measurable success/stop thresholds.
> - Specify funnel events and metrics for available offers, searches with matches, conversations, bilateral confirmations, completions, cancellations, incidents, and reports; define seed data and end-to-end scenarios.
>
> **Acceptance criteria:** an approved MVP scorecard, event dictionary, test dataset/scenarios, launch checklist, and explicit product decisions are ready for SP11 and final approval in T01.

Deliverable: one file, `docs/spikes/SP10-mvp-scope-pilot-metrics.md`, with the eight protocol sections in order (`docs/spikes/README.md:20–34`).

## 2. Evidence and sources

### Observed (read in this repository)

**One-market scope and MVP product scope.** The MVP starts in Ciudad Ojeda; Cabimas and Maracaibo
are explicitly deferred until the first market is validated (`README.md:7`; `AGENTS.md:7`; T01
`line 110`; T04 `line 146`; T20 `line 258`). `README.md:17–23` lists the five MVP items: (1) buy/sell
offers by pair, amount, payment method, area, expiration; (2) search with manual filters and local
natural language; (3) list/map results, offer details, public seller profiles, in-app contact;
(4) public-meeting recommendations, reputation, blocking, reports; (5) seller subscriptions and
publishing/moderation controls.

**Business model and service boundary.** Buyers free; sellers pay monthly subscriptions; **no
per-exchange commission** (`README.md:11–15`, `AGENTS.md:7`; T01 `line 112`, T08 `line 173`). The app
"does not custody cash or crypto, settle exchanges, or provide escrow" (`README.md:9`; `AGENTS.md:11`),
and verification must not be presented as a safety guarantee (`AGENTS.md:15`; T14 `line 211`).

**The exchange funnel already implied by the flows.** Search → offer detail → in-app chat → mutual
agreement → exchange record (inherits the offer's market) → meet → outcome, where a completed outcome
may lead to a rating and a problem/cancellation leads to a report
(`docs/flows/search-and-contact.md:3–29`); seller side: publish → active → chat → agree → exchange →
completed/cancelled/expired (`docs/flows/seller-offer-lifecycle.md:3–26`).

**Lifecycle and state vocabulary to be measured.** `confirmed_by_both` records mutual commitment and
does **not** mean the exchange occurred or completed; completion is bilateral; a disagreement is
recorded as an incident, not a completion; mutual cancellation is the only normal cancellation after
confirmation; no-show/payment/safety are incident types; reservations release only after mutual
cancellation while the offer stays active/valid (backlog T13 `lines 200–206`; SP04 brief
`lines 53–58`). One offer may serve multiple buyers, each transaction whole, no partial execution
(backlog T01 `line 110`, T09 `lines 178–180`).

**Search requires an active market.** Every search is scoped to the selected market polygon via
PostGIS; GPS centers proximity when active but never expands the market (backlog T10 `lines 181–186`;
SP05 brief `lines 59–64`; `docs/architecture.md:47–48`).

**Support/trust operations are SP07's.** Report, block, no-show, fraud/safety incident, moderation,
appeal, and support workflows are defined by SP07 (`/tmp/backlog2.md:71–75`) and implemented by T14
(`lines 207–212`); SP10 cannot invent them, so support readiness is only a checklist consuming SP07.

**E2E harness and its limits.** One disposable database per worktree, a documented seed command
(`npm run test:e2e:seed`) and teardown, and mobile flows via Maestro 2.11.0
(`docs/testing/e2e.md:12–21,35–47`). There is **no CI**; the mobile suite is a local gate only, and
whether it joins the mandatory gate is itself open (`docs/testing/e2e.md:98–108`).

**Current implementation state and the absence of analytics.** Only auth/health exist; markets,
offers, search, chat, subscriptions, and exchange records are not implemented (`README.md:51–55`,
`docs/audit/t00-baseline.md:208–217`), and `openspec/specs/` holds only the e2e-foundation and mobile
app-shell/design-system specs (`docs/audit/t00-baseline.md:55`), so no marketplace capability exists
to measure yet. A repository search for `analytics|observability|telemetry|metric` across Markdown
found no product analytics decision or provider, so nothing today emits funnel events. T00 is approved
and T01 unblocked (`docs/audit/t00-baseline.md:498–506`), so SP10's evidence base is the baseline.

### Assumed (not verified here — flagged, not asserted)

- That the ten directional pairs and their labels are settled enough to bucket seed offers; the catalog
  is listed but not yet approved (backlog T01 `line 110`; SP01 owns normalization).
- That the business day boundary and timezone for a "pilot day" will come from SP11 (backlog
  `lines 92–98`); SP10 does not choose it.
- That no analytics SDK may be added by this spike: the stack is fixed (`README.md:35–40`;
  `AGENTS.md:78`), and SP09 says not to add frameworks without an approved ADR (`/tmp/backlog2.md:83`),
  so instrumentation is proposed as a requirement, not implemented.

## 3. Options considered

### A. What the pilot must include (scope cut)

- **A1 — Full five-item MVP at once.** Pros: matches `README.md:17–23`. Cons: couples subscriptions,
  moderation, and ratings into the first live test, so a failure cannot be attributed to supply,
  demand, or support. Rejected as the *first* gate, kept as the eventual MVP.
- **A2 — Thin end-to-end funnel, one market.** Only the path the funnel metrics need: seller
  eligibility + one active subscription state, offer publish/pause/close, manual search within the
  Ciudad Ojeda polygon, offer detail + public profile, one conversation, bilateral confirmation,
  bilateral completion, mutual cancellation, incident recording, report/block. Pros: every §4 metric
  is observable on this path; smallest surface to instrument and support. Cons: needs the §3B
  deferral list. **Kept as the recommendation.**
- **A3 — Offline/paper pilot.** Contradicts the T-1 E2E gate and produces no funnel events. Rejected.

### B. Features explicitly deferred (candidate list)

- **B1 — Cabimas and Maracaibo.** Deferred by the backlog itself (`T04:146`, `T20:258`). Kept deferred.
- **B2 — Natural-language search (T11/SP12).** Manual search (T10) satisfies the funnel; NL search is
  an interpretation layer on the same deterministic path (`README.md:20`).
- **B3 — Ratings and reputation display (T14).** The funnel needs completion, not a rating score.
- **B4 — Self-serve subscription billing (T08/SP08).** Candidate: pilot sellers activated through an
  approved temporary mechanism while the provider is not ready (backlog T08 `lines 171–173`), with the
  entitlement *state* still enforced by the backend. Provider choice is SP08's.
- **B5 — Replenishment of published inventory.** Explicitly undefined and not to be assumed
  (backlog T01 `line 110`); new inventory means a new offer during the pilot.
- **B6 — Native passkeys.** Blocked on RP domain/associations (`README.md:54`,
  `docs/flows/authentication.md:48–52`); password + verified email/phone is the pilot sign-in.
- **B7 — Realtime chat, push notifications, rich maps.** Polling and the existing in-app contact path
  are enough to count a conversation.
- **B8 — Promotions/priority ranking and multi-market analytics.** Deferred; SP06/SP07 own the ranking
  and promotion rules (`README.md:55`).

### C. How to instrument the funnel

- **C1 — Server-derived events only (from existing tables/status transitions).** Pros: no new SDK,
  no client trust, respects the fixed stack; every event maps to a state the backend already owns.
  Cons: cannot see pre-submit UI friction. **Kept as the source of truth for the scorecard.**
- **C2 — Client analytics SDK.** Pros: UI drop-off. Cons: a new framework needs an approved ADR
  (SP09 `line 83`; `AGENTS.md:78`); PII/retention rules not yet set. Candidate, deferred until approved.
- **C3 — Manual spreadsheet counting.** Rejected as the mechanism (not reproducible, not an event
  dictionary); allowed only as a fallback.

### D. Success/stop thresholds

- **D1 — No thresholds; judge qualitatively.** Rejected: the acceptance criteria require measurable
  thresholds (backlog `line 89`).
- **D2 — Candidate numeric thresholds with a fixed evaluation window, marked for product-owner
  approval.** **Kept**, expressed in §4 as placeholders the owner sets; no number here is a decision.

## 4. Recommendation

**Scope (A2 + B).** Run one market — Ciudad Ojeda — over the thinnest path that makes the §4 metrics
observable, and defer B1–B8 until the owner approves re-entry. The pilot flow is: (1) seller with an
eligible account and active entitlement publishes one offer in Ciudad Ojeda; (2) buyer signs in,
selects Ciudad Ojeda, runs a manual search inside the polygon, and opens an offer; (3) a conversation
starts on that offer; (4) both confirm the same terms version (`confirmed_by_both`); (5) the outcome
is a bilateral completion, **or** a mutual cancellation, **or** an incident (no-show / payment /
safety), **or** a report/block.

**Instrumentation (C1).** Define the event dictionary below; emit server-derived events from the
state transitions the backlog already fixes. No analytics SDK is added by this spike.

### Event dictionary (candidate — names and properties need owner approval)

| Event | Trigger (state transition) | Key properties | Feeds |
| --- | --- | --- | --- |
| `offer.published` | offer moves to active (`T09:177–180`) | market_id, pair, amount, currency | Available offers |
| `offer.paused` / `offer.closed` / `offer.expired` | lifecycle transitions (`seller-offer-lifecycle.md:16–24`) | offer_id, reason | Supply churn |
| `search.performed` | a search runs against a market | market_id, filters_used, radius_km, gps_state | Searches |
| `search.matched` | search returns ≥1 active offer | result_count | Searches with matches |
| `search.empty` | search returns 0 | filters_used | Empty-state demand gap |
| `conversation.started` | buyer opens chat on an offer (`T12:195`) | offer_id, market_id | Conversations |
| `agreement.confirmed` | both confirm the same terms version (`T13:201`) | terms_version, pair, amount | Bilateral confirmations |
| `agreement.completed` | both confirm completion (`T13:205`) | agreement_id | Completions |
| `agreement.cancelled_mutual` | mutual cancellation (`T13:203`) | agreement_id | Cancellations |
| `incident.recorded` | no-show / payment / safety recorded (`T13:203`) | incident_type, agreement_id | Incidents |
| `report.created` | a report is filed (`T14:209`) | reason, subject_role | Reports |
| `user.blocked` | a block is set (`T14:209`) | — | Safety signal |

**Metric scorecard (candidate — thresholds are the owner's; §5 U-1).**

| Metric | Definition (from the events above) | Candidate threshold to approve | Stop candidate |
| --- | --- | --- | --- |
| Supply | active offers per market per day | ≥ N sellers, ≥ M active offers | < floor for K days |
| Search success | `search.matched` / `search.performed` | ≥ X% | ≤ Y% |
| Match→contact | `conversation.started` / `search.matched` | ≥ X% | — |
| Contact→commitment | `agreement.confirmed` / `conversation.started` | ≥ X% | — |
| Commitment→completion | `agreement.completed` / `agreement.confirmed` | ≥ X% | ≤ Y% |
| Cancellation rate | `agreement.cancelled_mutual` / `agreement.confirmed` | ≤ X% | ≥ Y% |
| Incident rate | `incident.recorded` / `agreement.confirmed` | ≤ X% | ≥ Y% |
| Report rate | `report.created` / completed exchanges | ≤ X% | ≥ Y% |

Every `N, M, X, Y, K` is a placeholder. The owner sets the numbers and the evaluation window.

### Seller-supply readiness (candidate checklist)

- Enough eligible sellers per market that every directional pair a buyer searches has at least one
  active offer (the count is U-2). Eligibility is T07's; this spike only counts readiness.
- Each pilot seller has completed one end-to-end run in staging before launch (rehearsal), because
  supply that has never published is not "ready", and every pilot seller's entitlement state is active
  at launch (B4) regardless of which billing mechanism the owner approves.

### Support readiness (candidate checklist)

- Consumes SP07's report/block/incident/moderation/appeal workflows (`/tmp/backlog2.md:71–75`) and
  T14's implementation (`lines 207–212`); SP10 does not define them. Each `T13:203` incident type has
  an owner and a triage path, and a named human is on call for the pilot window (SP07).
- Safety copy states the no-custody/no-guarantee boundary (`AGENTS.md:15`, `T14:211`), and SP08's
  launch recommendation supplies the legal/compliance blockers (`/tmp/backlog2.md:76–80`).

### Seed data (candidate — volumes are U-3)

The seed must let each §7 scenario run and each metric be non-zero:

- One market: the Ciudad Ojeda polygon (the real boundary comes from T01/T04, not this spike), with
  at least one coordinate inside, one on the boundary, and one outside, reused from T10's tests.
- ≥1 eligible seller with an active entitlement, ≥1 buyer, and ≥1 offer per direction the owner wants
  covered — spanning at least VES↔USDT, VES↔USD cash, and Zelle↔USDT so all four asset rails appear.
- At least one offer that can serve two buyers (multi-buyer) and one that depletes to zero; plus
  conversations, one `confirmed_by_both`, one completion, one mutual cancellation, one incident, and
  one report, so every event name in the dictionary is exercised.
- The seed stays in the disposable `_test` database (`docs/testing/e2e.md:35–47`); it is fixture data,
  not production data.

### Launch checklist (candidate)

1. T-1 E2E gate green and baseline test set passing (`docs/audit/t00-baseline.md:459–472`).
2. The §7 scenarios implemented as E2E coverage **before** the features they cover (backlog
   `lines 12,25`; `docs/testing/e2e.md:1–6`).
3. Event dictionary implemented server-side; each event traceable to a state transition.
4. Seller-supply and support readiness checklists complete.
5. SP08 legal/compliance blockers cleared or explicitly accepted by the owner.
6. Thresholds and evaluation window approved (§5 U-1).
7. Rollback: ability to pause offers / disable a market without data loss (T04/T09 own the mechanism).

## 5. Unresolved decisions

Every item below is the product owner's unless stated. None is decided by this spike.

- **U-1 — Success and stop thresholds and the evaluation window.** Owner: product owner. Candidate
  placeholders are in §4; the numbers and the window are not set.
- **U-2 — Minimum seller and offer supply for launch.** Owner: product owner + operations.
- **U-3 — Seed dataset size and which pairs are covered in the pilot.** Owner: product owner.
- **U-4 — Final deferred-feature list (B1–B8).** Owner: product owner. B1 is fixed by the backlog;
  B2–B8 are candidates.
- **U-5 — Whether a client analytics SDK is added (C2) and its PII/retention rules.** Owner: product
  owner + technical lead; a new framework needs an approved ADR (SP09 `line 83`; `AGENTS.md:78`).
- **U-6 — Billing mechanism during the pilot (B4) and listing rights after expiry.** Owner: SP08 /
  product owner.
- **U-7 — Support response expectations and on-call model.** Owner: SP07 / operations.
- **U-8 — Whether the mobile Maestro suite joins the mandatory launch gate.** Owner: QA + product
  owner (`docs/testing/e2e.md:107–108`).
- **U-9 — The Ciudad Ojeda polygon source.** Owner: T01 (`/tmp/backlog2.md:109`); SP10 only consumes it.
- **U-10 — Whether seller profiles/billing are global or market-specific**, which changes what
  "per-market supply" counts. Owner: T01 (`AGENTS.md:9`).

## 6. Product and technical impact

**Product.** The pilot becomes measurable on the exact funnel the backlog already encodes, with no
new rules. Deferring B2–B8 keeps the first live test attributable to one thing: whether supply and
demand meet on the thin path. The scorecard gives the owner an evidence-based go/stop call instead of
a qualitative one.

**Technical.** Instrumentation is server-side, emitted from state transitions, so it lands inside the
hexagonal modules that own those states (offers, search, conversations, exchanges, trust & safety)
rather than a new cross-cutting service, and adds no dependency. The event dictionary constrains T02's
API contracts (T02 `lines 117–124`) and gives F01/SP11 the immutable records they already require
(`/tmp/backlog2.md:92–98`). The seed data extends the existing `test:e2e:seed` mechanism rather than
introducing a second one (`docs/testing/e2e.md:20`). The risk: counting events is only as trustworthy
as the transitions that emit them, so each event must be tied to a tested transition, not a UI action.

## 7. Testable scenarios

Concrete WHEN/THEN scenarios for future E2E coverage, reusing the vocabulary the backlog fixes.

- **WHEN** a seller with an active entitlement publishes a valid offer in Ciudad Ojeda **THEN** an
  `offer.published` event is recorded **AND** the offer appears in that market's search.
- **WHEN** a buyer runs a manual search inside the polygon that matches **THEN** `search.performed`
  and `search.matched` are both recorded **AND** only in-market offers are returned.
- **WHEN** a search matches nothing **THEN** `search.empty` is recorded and no `search.matched` is.
- **WHEN** a buyer starts a chat from an offer **THEN** `conversation.started` is recorded with the
  offer's market.
- **WHEN** both parties confirm the same terms version **THEN** `agreement.confirmed` is recorded
  **AND** the amount is reserved atomically, never exceeding availability (`T09:180`).
- **WHEN** both parties confirm completion **THEN** `agreement.completed` is recorded; **WHEN** they
  disagree on completion **THEN** an incident is recorded instead (`T13:205`).
- **WHEN** both parties agree to cancel after confirmation **THEN** `agreement.cancelled_mutual` is
  recorded **AND** the amount returns to availability while the offer stays active/valid (`T13:203`).
- **WHEN** a no-show, payment problem, or safety concern is recorded **THEN** `incident.recorded`
  carries the correct incident type.
- **WHEN** a report is filed **THEN** `report.created` is recorded and the reporter's identity is not
  exposed to the subject.
- **WHEN** one offer serves two buyers with separate full transactions **THEN** two
  `agreement.confirmed`/`agreement.completed` pairs are recorded and availability never goes negative.
- **WHEN** the pilot seed is applied **THEN** every event name in §4 has at least one row to count.

## 8. Sources reviewed

- `docs/spikes/README.md` — the spike protocol, sections, and the spike table.
- `/tmp/backlog2.md` — SP10 (`87–91`) and the sibling briefs it depends on: SP04 (`53–58`), SP05
  (`59–64`), SP07 (`71–75`), SP08 (`76–80`), SP09 (`81–86`), SP11 (`92–98`); T01 (`106–116`), T02
  (`117–124`), T04 (`141–147`), T06 (`155–161`), T08 (`168–174`), T09 (`175–180`), T10 (`181–186`),
  T12 (`193–198`), T13 (`199–206`), T14 (`207–212`), T17–T19 (`228–245`), F01 (`246–252`), T20
  (`253–259`), the spike protocol (`34–35`), and the handoff rules (`260–263`).
- `AGENTS.md` — product context (`5–15`), spec-driven/E2E rules (`17–31`), stack and
  no-new-framework rules (`13,54–78`).
- `README.md` — product scope and model (`7,11–23`), market scope (`25–27`), architecture (`35–40`),
  implementation status (`49–55`), test commands (`117–137`); `docs/architecture.md` — boundaries and
  market scoping (`43–53`), current status (`55–57`).
- `docs/flows/search-and-contact.md` (buyer funnel, `3–29`), `docs/flows/seller-offer-lifecycle.md`
  (seller funnel, `3–26`), `docs/flows/authentication.md` (pilot sign-in limits, `46–52`).
- `docs/testing/e2e.md` — entry points, seed/teardown, isolation, handoff, and the CI gap
  (`12–21,35–47,90–108`).
- `docs/audit/t00-baseline.md` — approved baseline, empty specs, current implementation state
  (`55,208–217,459–472,498–506`).
- `openspec/config.yaml`; `openspec/specs/testing/e2e-foundation/spec.md` and
  `openspec/specs/mobile/app-shell/spec.md` — what exists today to measure against.
