# Design

## Context

See proposal.md — Why. The evidence behind each open decision is in `docs/spikes/SP01`–`SP12`, the
three `docs/spikes/CROSS-*.md` cross-checks, and `docs/adr/0001`–`0008`.

The register below is the whole of T01's remaining work. It is deliberately a list of **questions with
owners**, not answers: the backlog forbids an agent inventing these, and each one changes what gets
built.

## Decisions already taken

Recorded here so they stop living in chat. Each already has an ADR or an authoritative note.

| Decision | Where it lives |
| --- | --- |
| **Zelle is out of the MVP** — five pairs remain: VES → USDT, VES bank → VES cash, VES → USD cash, USDT → VES, USDT → USD cash | T01 in Notion; `AGENTS.md`; `README.md` |
| **The market boundary is the official limit of Municipio Lagunillas**, sourced from **OpenStreetMap**, with the attribution "© OpenStreetMap contributors" required in the app | T01 in Notion; `SYNTHESIS.md` |
| **Daily earnings bucket on market-local time** (`America/Caracas`), computed server-side | `SYNTHESIS.md` |
| **Stored inventory counters**, with one-writer-same-transaction, CHECK constraints, and an asserted reconciliation | `SYNTHESIS.md` |
| **Decisions live as ADRs** under `docs/adr/` | `docs/adr/README.md` |
| **The seller sets every commercial value**; no platform reference rate, and the rate is a structured, normalized field search filters and orders by | **ADR-0008** |
| **Test convention**: E2E in its own folder, every testable unit with a test beside it | `AGENTS.md` |
| **E2E stays local-only** — the mobile suite joins no CI or launch gate | `SYNTHESIS.md` |
| **Terms versions belong to the offer**; SP04's status enum; the closed search-criteria schema; two-axis pairs with one closed id; the publish gate composed in the use case | **ADR-0001**–**0006** |

## The open register

Grouped by what each decision blocks. **Owner** is who must answer; nothing here is an agent's call.

### A — blocks the pair/rail contract and search (T02 → T09, T10)

| # | Decision | Blocks |
| --- | --- | --- |
| A1 | **The pair/rail enum members and canonical labels** — which asset and rail identifiers exist (`VES_CASH` vs `VES_BANK_TRANSFER` vs `VES`; `USDT_TRANSFER`; `USD_CASH`), and **the rail of the unqualified "VES" leg**, which SP01 flagged as ambiguous | The offer direction, search filters, and the parser's enum |
| A2 | **Whether fully-digital pairs require an in-person meeting** — some pairs have no physical leg at all, which sits in tension with the product's in-person framing | Search, safety guidance, and the agreement flow |

### B — blocks pricing and the offer/quote contract (T02 → T09)

| # | Decision | Blocks |
| --- | --- | --- |
| B1 | **How the seller margin is expressed** (percentage, absolute spread, or fixed amount) and its bounds | The offer schema and the quote |
| B2 | **Whether a same-asset pair carries a rate at all** (VES bank → VES cash has no currency conversion) | The rate field's meaning per direction |
| B3 | **Quote validity and refresh policy** | The quote's `valid_until` and the confirmation binding |
| B4 | **Rounding scale and mode per asset** | The frozen amounts both parties see |
| B5 | **Min/max amount bounds and who sets them** (platform, plan, or seller) | Offer validation and plan limits |
| B6 | **Default offer expiry and its cap** — now load-bearing, because expiry is the *only* mitigation for rate staleness under ADR-0008 | Offer lifecycle and search visibility |

### C — blocks the agreement state machine (T02 → T13)

| # | Decision | Blocks |
| --- | --- | --- |
| C1 | **Does a single-party incident report release the reservation?** SP04 called this the single most consequential choice in the machine | The reservation release rule and the incident path |
| C2 | **Is the reservation held or released during reconfirmation** after a terms change? | The terms-change transition |
| C3 | **Do unconfirmed agreements expire, and after what window?** | Whether inventory can be pinned by an unresponsive party |

### D — blocks the inventory model (T02 → T09)

| # | Decision | Blocks |
| --- | --- | --- |
| D1 | **Is replenishment allowed at all?** SP03 recommends an append-only ledger *if* it is, but did not choose | The offer amount model and T09's scope |

### E — blocks seller onboarding and trust (T06, T07, T14)

| # | Decision | Blocks |
| --- | --- | --- |
| E1 | **Which contact verification is mandatory to publish** (email, phone, both, or none) — noting both delivery providers are unconfigured today | The publish gate and a launch dependency |
| E2 | **Which reputation signals ship**, and whether sellers need identity/KYC beyond contact verification | The public profile and T14 |
| E3 | **Blocking semantics** — one-way or mutual, and account-wide or per-conversation | Chat, reports, and the profile view |
| E4 | **Moderation roles, evidence retention, appeal, and response SLAs** | T14's operations and the support model |
| E5 | **Whether seller profiles and subscription billing are global or market-specific** | Several contracts at once — flagged since the first README |

### F — blocks subscriptions (T08)

| # | Decision | Blocks |
| --- | --- | --- |
| F1 | **Plan names, prices, currency of charge, and plan-based limits** | The plan model and the offer form |
| F2 | **The initial payment provider or channel** | The billing port's concrete adapter |
| F3 | **Access policy at expiry**, any grace period, and the listing rights of already-published offers | The entitlement function and T17's messaging |
| F4 | **Renewal model and refund policy** | The subscription state machine |
| F5 | **Whether app-store billing is mandatory** for a feature-unlocking subscription | The provider choice and its commission |

### G — legal review (blocks launch, not the build)

| # | Decision | Blocks |
| --- | --- | --- |
| G1 | **USDT/OFAC sanctions screening obligations** and the SDN/geography policy | Any USD or USDT leg |
| G2 | **Privacy and retention obligations** for billing records, report evidence, and any stored location | Schema retention and the privacy notice |
| G3 | **Jurisdictional review of the VES / USD-cash / USDT model and disclosures** | Launch, per SP08 |

### H — blocks the search parser (T11, T12)

| # | Decision | Blocks |
| --- | --- | --- |
| H1 | **LLM provider and model**, chosen by SP12's scorecard | The parser adapter |
| H2 | **The PII-minimisation rule** for free text | What leaves the device |
| H3 | **Cost budget at pilot scale** | Whether the hosted path is viable |
| H4 | **Whether free-text parsing requires authentication** | The search endpoint's guard |
| H5 | **Whether parsed criteria and prompts are logged or persisted**, and for how long | Retention and privacy |

### I — blocks the pilot (T20)

| # | Decision | Blocks |
| --- | --- | --- |
| I1 | **Pilot success and stop thresholds**, and the evaluation window | SP10's scorecard |
| I2 | **Minimum seller and offer supply** | Launch readiness |
| I3 | **The final deferral list** | Scope, and what T20 gates |
| I4 | **Whether a client analytics SDK is added at all** — a new framework needs an approved ADR | SP10's instrumentation |

### J — smaller product calls

| # | Decision | Blocks |
| --- | --- | --- |
| J1 | **Whether the seller's margin is displayed as "earnings"**, and under what label | SP11's daily summary |
| J2 | **Out-of-node UX copy** | SP06's clarification state |
| J3 | **GPS accuracy threshold** | Whether a fix is trusted |
| J4 | **Stored location precision and retention** | The location privacy boundary |
| J5 | **Default search radius and its bounds** | The criteria defaults |

## Risks / Trade-offs

- [A register can become a second copy of the truth and drift] → once a decision is answered, the
  register row is replaced by a pointer to its ADR, and `SYNTHESIS.md`'s open list becomes a pointer
  here rather than a duplicate.
- [Answering decisions in isolation can produce an incoherent set] → the grouping is by *what each
  blocks*, so decisions that must agree sit in the same group; the product owner should answer a group
  at a time rather than one row at a time.
- [An agent might answer a row to make progress] → this change's tasks contain no implementation, and
  the register states owners explicitly. A row answered without the owner is a defect, not progress.

## Migration Plan

No code, schema, or dependency changes. Rollback is a revert of the commit.

## Open Questions

This change *is* the open questions. There is no separate list.
