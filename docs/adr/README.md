# Architecture Decision Records

One file per decision, under `docs/adr/`. The product owner has decided that decisions live here, so
an implementer reads one current contract instead of re-deriving it from the spike reports
(`docs/spikes/SYNTHESIS.md:149`).

These records come from two changes. **0001–0008** are produced by the
`spike-interface-reconciliation` change (`openspec/changes/spike-interface-reconciliation/`): they
reconcile the shapes and names the discovery spikes (SP01–SP12) disagreed on, and they decide no
product value, threshold, or boundary
(`openspec/changes/spike-interface-reconciliation/design.md:13-15`). **0009 onward** are produced by
the `t01-product-decisions` change (`openspec/changes/t01-product-decisions/`): they record the
product owner's answers to the register in its `design.md`, so they **do** fix product values,
thresholds, and boundaries.

## Convention

- **Numbering:** zero-padded, four digits — `0001`, `0002`, … The number is the filename prefix and
  is never reused.
- **Filename:** `NNNN-<short-slug>.md`.
- **Status:** each record is `Accepted` or is explicitly marked otherwise; an accepted record is
  current until a later record supersedes it.
- **Supersedes:** where a record corrects a claim in a spike report, it names the claim by file and
  line. The correction is additive: the report's original text stays visible with a pointer to the
  ADR (`openspec/changes/spike-interface-reconciliation/design.md:89-90`).

## The rule

An ADR records a decision that later work may cite. When an implementation task or a later change
needs to know what was decided, it cites the ADR number rather than a spike report or a chat
message: the ADR is the current contract, and the spike reports are the evidence behind it
(`openspec/changes/spike-interface-reconciliation/proposal.md:34-35`).

## Index

| # | Title | Decision in one line |
| --- | --- | --- |
| [0001](0001-terms-versions-belong-to-the-offer.md) | Terms versions belong to the offer | The immutable terms version is owned by the offer (`offer_terms_versions`); an agreement references a version id. |
| [0002](0002-search-location-is-optional.md) | Search location is optional | When GPS is unavailable, denied, or outside the node, the search runs against the whole active market. |
| [0003](0003-search-criteria-schema-is-closed.md) | Search criteria schema is closed | SP06's allowlisted criteria schema is the contract; SP12 emits its field names, plus an explicit unparsed outcome. |
| [0004](0004-agreement-status-enum.md) | Agreement status enum | SP04's agreement status enum is authoritative; SP11 adopts it. |
| [0005](0005-pair-and-rail-representation.md) | Pair and rail representation | Two-axis `{asset, rail, delivery}` legs internally, one closed pair id externally; the members are the product owner's. |
| [0006](0006-publish-authorization-composition.md) | Publish authorization composition | Publishing requires seller eligibility AND subscription entitlement, composed in the offer-publish use case from two ports. |
| [0007](0007-offer-and-quote-shape.md) | Offer and quote shape | The offer/quote shape is stable whichever way the platform-reference question goes. |
| [0008](0008-seller-sets-commercial-values.md) | Seller sets commercial values | The seller sets every commercial value; the platform publishes no reference rate and computes none. |
| [0009](0009-mvp-pair-and-rail-catalog.md) | The MVP pair and rail catalog | Five canonical pair ids on three assets and four rails; the unqualified "VES" leg is physical cash; a meeting is required when either leg is physical. |
| [0010](0010-mvp-pricing-and-offer-terms.md) | MVP pricing and offer terms | Margin is a percentage bounded `0 ≤ margin < 100`; same-asset pairs carry no rate; quotes last 15 minutes; round once server-side to the receive asset's minor unit; seller-set min/max with only a `> 0` platform floor; expiry defaults to 7 days, capped at 30. |
| [0011](0011-mvp-agreement-rules.md) | MVP agreement rules | An incident report does not release the reservation (only mutual cancellation or moderation does); the reservation is held during reconfirmation; an unconfirmed agreement expires after 24 hours. |
| [0012](0012-mvp-inventory-no-replenishment.md) | MVP inventory has no replenishment | No replenishment in the MVP; a seller wanting more publishes a new offer; SP03's append-only ledger stays the documented option. |
| [0013](0013-mvp-onboarding-and-trust.md) | MVP onboarding and trust | No contact verification required to publish (a pilot relaxation, verify before launch); no reputation signals; mutual account-wide blocking; manual moderation with an appeal path and owner-set SLAs; profiles and billing global. |
| [0014](0014-mvp-subscriptions-deferred.md) | MVP subscriptions are deferred | Subscriptions deferred; every seller entitled through the documented temporary mechanism; the entitlement port stays so ADR-0006's publish gate is real, not stubbed. |
| [0015](0015-mvp-search-defers-natural-language.md) | MVP search defers natural language | Manual filters only; the parser port stays defined but unimplemented, so the deferral is a missing adapter rather than a redesign. |
| [0016](0016-mvp-account-type.md) | Selling is a state, not an account type | No `accountType` field is added: publishing comes from `SellerEligibility` plus entitlement per ADR-0006, and the demo's two accounts differ by seeded eligibility. |
| [0017](0017-mvp-location-and-search-defaults.md) | MVP location and search defaults | GPS fixes worse than 100 m treated as no fix; location never persisted (request-scoped); default radius 5 km bounded by the market polygon; out-of-node copy offers "Search all of {market}" and "Change market". |
| [0018](0018-mvp-defers-earnings.md) | MVP defers earnings | The seller's margin is not displayed as "earnings"; the earnings screen is deferred with SP11; nothing on any screen may read as profit or verified earnings. |

## What these records leave open

The **reconciliation records (0001–0008)** settle names, owners, and representations only — never a
value, a threshold, or a boundary. The open items they touch remain the product owner's, and each
record names what it leaves open. Two of those items have since been answered: whether a platform
reference rate exists at all, and how the seller margin is expressed, is settled by **ADR-0008**; the
pair/rail enum members and the canonical labels are settled by **ADR-0009**
(`openspec/changes/spike-interface-reconciliation/design.md:70,107-108`).

The **T01 records (0009–0018)** record the product owner's answers, so they **do** fix values,
thresholds, and boundaries. Two groups of the T01 register stay **open** and are decided by no record
here: group **I** (pilot thresholds, supply minimums, the deferral list, and whether an analytics SDK
is ever added) and group **G** (the legal review). Neither blocks the MVP build
(`openspec/changes/t01-product-decisions/design.md:99-115`).

The Ciudad Ojeda polygon is out of scope for the reconciliation change and is not decided by any record
here (`openspec/changes/spike-interface-reconciliation/proposal.md:67-68`).
