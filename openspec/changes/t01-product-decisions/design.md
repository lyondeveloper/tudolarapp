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

## The register, answered

The product owner authorized these calls on 2026-10-17, with the instruction that the MVP be built
step by step from them. Each becomes an ADR; any of them can be overruled, and overruling one means
editing its ADR rather than adding a second.

**MVP shape.** The MVP is the **both-sides loop**: a seller publishes an offer and a buyer finds it in
search, on the real mobile app, against the real API and database. Accounts are separated by purpose
through an **`accountType` of `seller` or `buyer` on the user model**, so a demo can hand one phone to
each side.

> **Flagged tension, deliberately accepted for the MVP.** An account *type* of "seller" collides with
> ADR-0006, where selling is a **state** (`SellerEligibility` plus entitlement), not an account kind —
> in the real product one person may both buy and sell. For the MVP, `accountType` is a convenience
> that seeds `SellerEligibility`; it is not a new authorization axis, and no permission may be granted
> from `accountType` alone. Revisit when subscriptions land.

### A — pair and rail

- **A1** Five canonical pair ids: `VES_USDT`, `VES_BANK_TO_VES_CASH`, `VES_USD_CASH`, `USDT_VES`,
  `USDT_USD_CASH`. Assets: `VES`, `USD`, `USDT`. Rails: `VES_CASH`, `VES_BANK_TRANSFER`,
  `USD_CASH`, `USDT_TRANSFER`. **The unqualified "VES" leg is physical cash**, because the product is
  in-person and the catalog itself contrasts "VES" with "VES in a bank account".
- **A2** A meeting is required whenever **either leg is physical**. A pair with two digital legs would
  not need one — but with Zelle gone, no MVP pair has two digital legs, so every MVP pair is in person.

### B — pricing and the offer

- **B1** Margin is a **percentage** the seller sets, bounded to `0 ≤ margin < 100`.
- **B2** Same-asset pairs (`VES_BANK_TO_VES_CASH`) carry **no rate** — there is no conversion. They
  carry a margin only, which is the seller's compensation for the form conversion.
- **B3** Quote validity **15 minutes**; the confirmation binds to the quote it was shown.
- **B4** Round **once, server-side, to the receive asset's minor unit**: `VES` and `USD` to 2 decimals,
  `USDT` to 6.
- **B5** The seller sets per-offer min and max. The platform sets only a floor of `> 0`; there is no
  platform maximum in the MVP.
- **B6** Offer expiry defaults to **7 days**, capped at **30**. Expiry is load-bearing under ADR-0008,
  because it is the only mitigation for a stale rate.

### C — agreement

- **C1** A single-party incident report **does not** release the reservation. Release happens only on
  mutual cancellation or a moderation decision — the anti-abuse choice, since the alternative hands
  one party a unilateral way to free inventory.
- **C2** During reconfirmation the reservation is **held**.
- **C3** An unconfirmed agreement **expires after 24 hours**, releasing any hold.

### D — inventory

- **D1** **No replenishment** in the MVP. A seller wanting more publishes a new offer. SP03's
  append-only ledger stays the documented option if this is revisited.

### E — onboarding and trust

- **E1** **No contact verification is required to publish** in the MVP — a documented pilot relaxation,
  because both delivery providers are unconfigured. The obligation to verify before public launch is
  recorded in the ADR.
- **E2** **No reputation signals** in the MVP: no ratings, no badges, no KYC beyond nothing. Every
  signal the platform lacks is one it cannot misrepresent as safety.
- **E3** Blocking is **mutual and account-wide**.
- **E4** Moderation is **manual review with an appeal path**; roles, evidence retention, and response
  SLAs are recorded as owner-set placeholders rather than invented numbers.
- **E5** Profiles and billing are **global**, not market-specific. There is one market in the MVP.

### F — subscriptions

- **F1–F5** **Deferred for the MVP.** Every seller is entitled through the documented temporary
  mechanism the backlog explicitly permits, and no billing is built. This removes the entire
  subscription build — provider, plans, webhooks, expiry — from the MVP while leaving the entitlement
  *port* in place so ADR-0006's publish gate is real rather than stubbed.

### G — legal

- **G1–G3** Recorded as **legal-review inputs, not clearances**: USDT/OFAC screening, privacy and
  retention for billing, report evidence and any stored location, and the jurisdictional review of the
  VES / USD-cash / USDT model. No real money moves in the MVP, and none of these are answered by an
  agent.

### H — search parser

- **H1–H5** **Natural-language search is deferred.** The MVP ships manual filters only. The parser port
  stays defined but unimplemented, so the deferral is a missing adapter rather than a redesign.

### I — pilot

- **I1–I4** **Not yet decided, and not blocking the build.** Pilot thresholds, supply minimums, the
  deferral list, and whether an analytics SDK is ever added belong to the pilot, not the MVP. The
  register rows stay open.

### J — smaller calls

- **J1** The seller's margin is **not** displayed as "earnings" in the MVP; the earnings screen is
  deferred with SP11's work. Nothing on any screen may read as profit or verified earnings.
- **J2** Out-of-node copy: the app names the active market and offers "Search all of {market}" and
  "Change market".
- **J3** GPS accuracy threshold: accept a fix within **100 m**; a worse fix is treated as no fix.
- **J4** Location is **not persisted**; the search centre is request-scoped. Nothing stores a user's
  coordinates.
- **J5** Default search radius **5 km**, bounded by the market polygon.

## The open register

**Superseded by the answers above.** The only rows still open are group **I** (pilot thresholds,
supply minimums, deferral list, analytics SDK) and group **G** (legal review), and neither blocks the
MVP build.

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

Two groups remain open, and neither blocks the MVP build: **I** (pilot thresholds, supply minimums,
the deferral list, and whether an analytics SDK is ever added) belongs to the pilot, and **G** (the
legal review) is an input from a lawyer rather than an engineering decision.
