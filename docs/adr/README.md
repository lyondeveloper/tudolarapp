# Architecture Decision Records

One file per decision, under `docs/adr/`. The product owner has decided that decisions live here, so
an implementer reads one current contract instead of re-deriving it from the spike reports
(`docs/spikes/SYNTHESIS.md:149`).

These records are produced by the `spike-interface-reconciliation` change
(`openspec/changes/spike-interface-reconciliation/`). They reconcile the shapes and names the
discovery spikes (SP01–SP12) disagreed on. They do **not** decide any product value, threshold, or
boundary; those stay with the product owner (T01)
(`openspec/changes/spike-interface-reconciliation/design.md:13-15`).

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

## What these records leave open

These ADRs settle names, owners, and representations only — never a value, a threshold, or a
boundary. The open items they touch remain the product owner's, and each record names what it leaves
open:

- Whether a platform reference rate exists at all, and how the seller margin is expressed
  (ADR-0007; `openspec/changes/spike-interface-reconciliation/design.md:107-108`).
- The pair/rail enum members and the canonical labels (ADR-0005;
  `openspec/changes/spike-interface-reconciliation/design.md:70`).

The Ciudad Ojeda polygon is out of scope for this change and is not decided by any record here
(`openspec/changes/spike-interface-reconciliation/proposal.md:67-68`).
