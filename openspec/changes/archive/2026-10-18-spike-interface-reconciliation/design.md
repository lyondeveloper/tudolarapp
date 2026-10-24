# Design

## Context

See proposal.md — Why. The evidence is in `docs/spikes/CROSS-A-transaction-lifecycle.md`,
`CROSS-B-discovery.md`, and `CROSS-C-commercial-trust.md`; the reports themselves are in
`docs/spikes/`.

The product owner has already fixed four constraints this change must respect: **Zelle is out of the
MVP** (five pairs remain), **daily earnings bucket on market-local time**, **stored inventory
counters are adopted**, and **decisions live as ADRs** under `docs/adr/`.

The constraint that shapes the whole change: this is a **shape** reconciliation. Every resolution
below settles a name, an owner, or a representation, and none of them settles a value, a threshold,
or a boundary. Where a resolution would need a product answer, it is marked open instead.

## Goals / Non-Goals

**Goals:**

- One answer per contested interface, so two agents cannot build two different things from the same
  evidence.
- A stable contract shape for the pieces T01's answers do not change, so T02 starts from coherence
  rather than from a fresh argument.
- Honest evidence: the reports are corrected where contradicted, with a pointer to the ADR, rather
  than silently rewritten.

**Non-Goals:**

- Any T01 product decision.
- T02's full contract set, which several items depend on T01 for.
- Any implementation.

## Decisions

**The immutable terms version belongs to the OFFER, not the agreement (SP09 over SP04).** T13 requires
the agreement record to capture "the same version of the offer's complete terms", so
`offer_terms_versions` is the source of truth and an agreement references a version id.
- Alternative considered: SP04's agreement-scoped snapshot, created when the agreement is proposed.
  Rejected: two agreements on one offer could then hold different snapshots of the same terms, and
  the offer's own history would be unrecoverable — which is exactly the history a seller edit needs.

**SP06 is wrong about GPS, and the backlog is right: location is optional.** When GPS is unavailable,
denied, or outside the node, the search runs against the whole active market. SP05, SP12 and the
backlog all say this, and SP06's own test case already asserts it — so the report contradicts itself,
not just its siblings.
- This is a correction to SP06, not a new decision.

**SP06 owns the closed criteria schema, and SP12 adopts it.** SP12's parser emits SP06's field names
(`direction{give,receive}`, `location{hint_text,radius_km}`, `amount{value,asset}`), not the older
names its report still shows.
- One addition is needed: SP06's `intent` enum has no way to express "cannot parse". The schema needs
  an explicit unparsed/needs-clarification outcome, because SP12's failure budget depends on the
  parser being able to say so rather than guessing.

**SP04's agreement status enum is authoritative, and SP11 adopts it.** SP11 invented "mutually
cancelled" and "disputed"; the real enum is `cancelled` and `incident_open`, alongside
`awaiting_confirmation` and `expired`, which SP11 never mentioned. F01 renders from SP11's approved
status, so the labels must match before either is built.

**The pair/rail model is two-axis internally, one closed enum externally.** A leg is
`{asset, rail, delivery}`; an offer is an ordered `(give, receive)` of legs. The API and the search
criteria expose a single **closed pair id** derived from those axes, because validation needs a flat
allowlist.
- Rationale: even after Zelle's removal, the two VES rails (bank transfer vs physical cash) prove a
  single method enum cannot express the catalog — that was SP01's finding, and Zelle's removal does
  not undo it.
- Alternative considered: one flat method enum, matching SP06 and SP12's current shape. Rejected: it
  cannot distinguish VES-by-bank from VES-in-cash, which are different pairs.
- The **members** of the enum are the product owner's; only the shape is settled here.

**The publish gate is composed in the offer-publish use case, from two ports.** Publishing requires
`seller eligibility AND subscription entitlement`, and the composition belongs in the use case — not
in the controller, and not inside either module.
- Rationale: AGENTS.md requires business invariants in the domain or the use case, and forbids
  controllers holding business rules. Both inputs are ports; neither module knows about the other.
- The vocabulary collision is resolved by keeping three distinct concepts with three distinct names:
  `AccountStatus` (can this account sign in), `SellerEligibility` (may this seller publish),
  entitlement (is the subscription active). "Suspended" must not be reused across them.

**The offer/quote contract shape is stable whichever way the platform-reference question goes.** SP01
gives each direction a seller-set rate; SP02 keeps a platform reference with only a margin on top.
That is a **product** call and stays open. But the shape does not depend on it: the offer stores an
explicit rate, the quote stores its source and as-of time, and the seller margin is its own field. So
this change settles the shape and leaves the question to T01.

## Risks / Trade-offs

- [Correcting the reports could look like rewriting evidence] → every correction is an addition with a
  pointer to the ADR, and the original text is left visible. A reader can see what changed and why.
- [Resolving a conflict against one report could be wrong] → each resolution names the source that
  wins and the rule that decides it (usually a backlog line or an AGENTS.md requirement), so it can be
  challenged on the same evidence.
- [A shape decision could quietly constrain a product answer] → the two-axis pair model is the only
  one that constrains anything, and it constrains the *representation* rather than the catalog; the
  members stay the product owner's.
- [T02 may still need to revisit a shape once T01 lands] → expected, and cheaper than revisiting it
  after two modules are built on contradictory interfaces.

## Migration Plan

No code, schema, or dependency changes. Rollback is a revert of the commit; the ADRs are additive and
the report corrections are additive.

## Open Questions

- Whether a platform reference rate exists at all, and how the seller margin is expressed — the
  product owner's, flagged above. It does not change this change's contract shapes.
- Whether the flat pair id should be an opaque id or a derived string. A T02 detail; it does not
  change the two-axis model.
