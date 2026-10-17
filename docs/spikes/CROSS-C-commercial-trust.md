# Cross-check C — Commercial and trust (SP01, SP02, SP07, SP08)

Analysis only. This file reads the four cluster reports against each other and against the adjacent
reports they name (`SP03`, `SP04`, `SP06`, `SP09`, `SP11`, `SP12`) and the synthesis
(`docs/spikes/SYNTHESIS.md`). It does not restate them. Every claim cites the file and line where it
matters. Nothing here is implemented, and no report is edited.

**Cluster under review:** `SP01-exchange-pairs.md`, `SP02-pricing-quotes-limits.md`,
`SP07-seller-eligibility-trust-safety.md`, `SP08-subscription-compliance-launch.md`.

**Two fixed constraints applied throughout** (`docs/spikes/SYNTHESIS.md:143,148`):

- **(a) Zelle is removed from the MVP**, leaving five pairs — VES → USDT, VES bank → VES cash,
  VES → USD cash, USDT → VES, USDT → USD cash. This removes the Zelle legal terms that were SP08's
  main compliance blocker (`SP08:52`).
- **(b) The quote and immutable terms-version contract is now owned by T02.**

---

## 1. Agreements — where two or more reports independently concluded the same thing

Independent convergence is the strongest signal, so each is named with its independent sources.

**A1. The seller margin and the platform commission are different things, and the platform commission
is exactly zero.** SP01 (`SP01:133` — "The seller margin remains distinct from the platform's zero
per-exchange commission"), SP02 (`SP02:39-41` — "The seller margin on the offer is separate and
mandatory"; `SP02:231`), and SP08 (`SP08:109` — "Keep the platform commission at exactly zero. There
is no platform-commission table, field, or calculation anywhere in the billing module") reach this
independently. All three cite the same backlog line (`/tmp/backlog2.md:110,112`). This is the cluster's
strongest agreement and the anchor for interface mismatch IM3.

**A2. Nothing in the model may imply custody, settlement, or escrow.** SP01 (`SP01:26,93` — a USDT leg
is "a digital on-chain transfer … the platform does not custody it"), SP02 (`SP02:65,270` — "the
platform still does not custody or settle"), and SP08 (`SP08:109`, and the no-commission rule) each
restate it independently from `AGENTS.md:11`.

**A3. Publishing is gated by two separate server-side state machines.** SP07 independently proposes a
persisted `SellerEligibility` state enforced in the offer use case (`SP07:47-50,83`), and SP08
independently proposes entitlement as "a server-side pure function of stored state plus the server
clock, evaluated at every gated operation" (`SP08:106`). Both cite the same T09 rule ("an offer cannot
be published without an eligible seller and active entitlement", `SP07:26`; `/tmp/backlog2.md:180`).
They agree there are two gates — but do not agree how they compose (see IM2).

**A4. Contact verification is verification, not identity, and "verified" must never promise safety.**
SP07 keeps contact-verification-only for MVP and rejects KYC as the default (`SP07:76-79`); SP08
independently requires that subscription status "must never read as a trust or safety guarantee"
(`SP08:95,132`). Both cite `AGENTS.md:15`.

**A5. External providers stay behind a port with a test adapter, and a successful payment is never
simulated.** SP08 states it directly (`SP08:110`) and mirrors the existing `EmailDeliveryPort` /
`SmsDeliveryPort` shape. SP07 independently treats the same provider gap as a launch dependency
(`SP07:53,115`). Both name production email/SMS as unconfigured (`README.md:54`).

**A6. Money is exact decimal / integer minor units, never binary float, with one server-side rounding
step.** SP02 (`SP02:36,228`) and SP08 (`SP08:134`) independently state it from `AGENTS.md:45`; SP11
does too (`SP11:174-177`).

**A7. The legal questions are not engineering conclusions.** SP01 defers Zelle/USDT legality to SP08
(`SP01:109,119-120`); SP08 frames its own findings as "evidence, not conclusions" (`SP08:64`;
`SYNTHESIS.md:109`). Agreement that a jurisdictional review owns them.

---

## 2. Conflicts

**C1 — Who owns the base rate: SP01 says the seller sets the rate; SP02 says the platform sets a
reference and the seller sets only a margin.** SP01 states "each direction carries a seller-set rate
(SP02)" (`SP01:110`). SP02 instead keeps "One platform reference per pair (single source +
timestamp)" (`SP02:88`) and derives the effective rate as `receive = give / (R_ref · (1 + M))`
(`SP02:123`), where `M` is the seller margin. **Judgement: SP02 is correct.** SP02 is the pricing
owner, and the backlog mandates a *margin field* (`/tmp/backlog2.md:110,112`; `SP02:44`), which
presupposes a base to adjust; a wholly seller-set rate would discard the reference requirement SP02
keeps. SP01's phrase is a loose summary. But the reference source itself is unresolved
(`SP02:244`, U1), so the product owner must confirm a platform reference exists at all — and note SP02
assigns that legal review to SP08 (`SP02:244`, "legal/compliance via SP08") while SP08's review scope
does **not** list a reference-rate source (see gap G7).

**C2 — Whether the same-currency VES bank → VES cash pair carries a margin is asserted by SP01 and
left open by SP02.** SP01 says of same-asset pairs: "There is no currency conversion, so the seller's
compensation is the margin … not a rate spread" (`SP01:94`). SP02's pricing table leaves the same row
open: "`R_ref` and whether `M` applies are **unresolved** (no 1:1)" (`SP02:127`). **Judgement: SP02 is
correct to keep it open.** Whether a margin applies when no conversion occurs is a monetary rule, and
`docs/spikes/README.md:40-42` forbids a spike from inventing one; SP01's sentence is closer to that
forbidden move than SP02's explicit "unresolved".

**C3 — SP01 says Zelle is a rail; SP02's pricing table and SP06/SP12's criteria treat Zelle as a leg
value.** SP01: "**Zelle is a rail, not an asset.** Every Zelle leg carries **USD**" (`SP01:92`).
SP02's table keys rows by display labels and lists "VES → USD cash / Zelle" and "Zelle → USD cash /
USDT" as if Zelle were an asset-shaped leg (`SP02:124,126`). SP06's schema emits `"give": "ZELLE"`
(`SP06:94`) and SP12's allowlist checks `payment_method_offered` against "the SP01 catalog"
(`SP12:106`). **Judgement: SP01 is correct** — Zelle moves USD over a US bank rail (`SP01:37,92`), so
it is a rail. **Constraint (a) partly dissolves this**: with Zelle removed, the Zelle rows in SP02,
SP06 and SP12 become dead. The underlying defect survives for the VES rails — see IM1.

**C4 — The margin is "applied" by one report and "never applied" by another.** SP02 says the margin
"drives the effective rate" computed server-side (`SP02:231`, `SP02:123`). SP08's test 10 asserts "the
seller's offer margin is stored and displayed but never applied by the platform" (`SP08:152`).
Read literally these contradict. **Judgement: both are correct about different things and the wording
must be disambiguated** — SP08 means *billing* applies no commission and creates no platform revenue
(`SP08:109`), while SP02 means the *pricing/offers* module applies the seller margin to compute the
displayed rate. Two different verbs for "applied". This is treated as interface mismatch IM3.

---

## 3. Interface mismatches

**IM1 — The pair/rail enum does not line up across SP01, SP02, SP06 and SP12.** SP01 owns the
vocabulary and defines each leg as a three-tuple: "Normalize each leg of a pair as **(asset, rail,
delivery)**" (`SP01:71`), with rails `USD cash`, `VES cash`, `VES bank transfer`, `Zelle`,
`USDT transfer` (`SP01:73`). The consumers do not match:

| Producer | Shape it emits | Line |
| --- | --- | --- |
| SP01 | leg = `{asset, rail, delivery}`; pair = ordered `(give, receive)` from a closed allowlist | `SP01:71-73` |
| SP02 | flat rate row keyed by display label, e.g. "VES → USD cash / Zelle" | `SP02:121-127` |
| SP06 | `direction: { give: "ZELLE", receive: "USD_CASH" }` — single value per side | `SP06:93-96` |
| SP12 | `payment_method_offered` / `payment_method_wanted` | `SP12:106` |

Four shapes, three field-name sets, no shared enum. SP06 itself flags the reconciliation as open
(`SP01:122` U6, owner "product + search backend (SP06, T02)"), and SP12 defers the enum to SP01 while
SP06 defers it to SP01 too (`SP12:73`) — so both consumers point at SP01 but neither adopts its
two-axis leg. **Constraint (a) does not fix this.** The five surviving pairs still contain both VES
rails (VES bank transfer in pair 2, bare VES elsewhere), and a single-value enum like SP06's cannot
distinguish them — which is exactly SP01's U1 (`SP01:117`). The two-axis leg, or an explicit rail
field, is still required; T02 must reconcile SP01's leg, SP02's rate key, and SP06/SP12's criteria
into one enum.

**IM2 — SP08's entitlement output does not compose with SP07's eligibility gate, and T09's publish
path consumes both.** SP08 defines the entitlement contract as a boolean derived from subscription
states `{pending, active, past_due, canceled_at_period_end, expired}` (`SP08:105-106`). SP07 defines a
different, persisted state set `none → contact_verified → eligible → suspended/rejected`
(`SP07:47`). T09 requires the publish gate to check *both* ("an eligible seller and active
entitlement", `/tmp/backlog2.md:180`), and T02's contract list names "subscriptions/entitlements"
(`/tmp/backlog2.md:122`) but **not** eligibility. So the single publish-authorization contract has no
owner: nothing says whether the gate is `eligible AND entitled`, which module composes them, or what
the combined response shape is. There is also a three-way name collision on "suspended": auth's
`AccountStatus.suspended` (`SP07:21`), SP07's `SellerEligibility.suspended/rejected` (`SP07:47`), and
SP08's subscription `expired` (`SP08:105`). T02 must define one composition point and one vocabulary.

**IM3 — "The margin is applied" vs "never applied": the seller-margin field crosses SP02 and SP08
with no shared contract.** SP02 owns the margin field and its semantics (`SP02:231`, U3 `SP02:246`);
SP08 owns billing and asserts it "is never read or applied by billing" (`SP08:109`). Both are
compatible once scoped, but no report states the boundary contract: (i) billing must not read the
offer's margin; (ii) the pricing/offers module applies it to derive the displayed effective rate;
(iii) neither produces a platform revenue line. This is the concrete "must not collide" surface — it
is currently only implied, not specified. SP08's test 10 (`SP08:152`) and SP02's scenarios 1 and 5
(`SP02:278,286`) will both pass while disagreeing about the word "applied" unless T02 fixes the
boundary.

**IM4 — Four names for the terms/quote objects that constraint (b) hands to T02.** SP02 defines an
`Offer` + `OfferVersion` + `Quote` + `TermsSnapshot` (`SP02:220-227`); SP04 defines
`agreement_terms_version` rows (`SP04:60`); SP09 defines an `offer_terms_versions` table
(`SP09:143`). Four overlapping object names, and SP02's field list is its own U10 (`SP02:253`).
Constraint (b) moves the quote and immutable terms-version contract to T02, so SP02's §4 and U10 are
now T02's deliverable — but SP02's report still reads as if it owns them, and SP09 U3 still routes
"terms-version storage shape … SP02 → T03" (`SP09:241`). T02 must unify the names and the field list;
SP04 and SP09 must consume the T02 contract rather than their local names.

**IM5 — SP08's launch-blocker list is now stale.** SP08 §6 lists Zelle-era blockers and a Zelle-centric
§2.2 (`SP08:52,137`), and SP10's launch checklist item 5 consumes "SP08 legal/compliance blockers"
(`SP10:215`). After constraint (a) the Zelle item is gone; the live blockers are USDT/OFAC screening
(`SP08:125` U8), app-store billing (`SP08:123` U6), and privacy/retention (`SP08:124` U7). SP08's
list must be re-derived, or SP10 will gate launch on a moot item and miss the ones that remain.

---

## 4. Gaps — responsibilities no report owns, or each assumes the other owns

**G1. The publish-authorization composition point has no owner.** SP07 owns eligibility, SP08 owns
entitlement, T02 owns the entitlement contract, T09 consumes it — but no report names who composes
eligibility + entitlement + market scope into the one decision T09 needs, or where it lives. This is
the ownership half of IM2.

**G2. Ordering and trust for irreversible remote legs is assigned to SP07 and answered by nobody.**
SP01 explicitly hands it over: "**U5 — Ordering and trust for remote legs.** … **Owner: trust & safety
(SP07) + product (SP04)**" (`SP01:121`). SP07 never addresses it — its safety model is in-person
meetings and public places (`SP07:74,88`). This is live after Zelle removal, because VES → USDT is
remote on both legs (VES bank transfer in, USDT on-chain out; `SP01:77`), and the transfer is
irreversible with no escrow (`SP01:39`). SP04 owns the incident *record* but not the ordering rule.

**G3. No one owns validating the mandatory seller margin at publish.** SP02 says the margin field is
mandatory and stored (`SP02:44,231`); SP07 owns the publish gate (`SP07:83`); SP08 owns entitlement
(`SP08:106`). T09 lists the "seller commission/margin field" among validated publish fields
(`/tmp/backlog2.md:178`), so T09 owns the *check* — but SP02's U3 (margin expression and bounds,
`SP02:246`) is unresolved, so T09 has nothing to validate against until the owner decides it. The
dependency is unstated.

**G4. Eligibility and entitlement are each possibly per-market, and neither report owns the
decision.** SP07's own test requires eligibility to be "re-evaluated for that market and … not
inherited" (`SP07:145`), yet SP07 U7 leaves global-vs-market-specific open (`SP07:114`); SP08 U3
leaves billing scope open and only says the entitlement function should take scope as a parameter
(`SP08:72`). If eligibility is per-market *and* entitlement is per-market, that is a third dimension
of state neither report models.

**G5. SP08 assigns a billing support row to SP07's workflow, and SP07's workflow has no such row.**
SP08 U11: "Billing support workflow … **SP07 owns the general workflow**" (`SP08:128`). SP07's
support table covers report, block, no-show, fraud, moderation, appeal, and passkey recovery
(`SP07:94-102`) — there is no row for a failed renewal, a disputed charge, or an incorrect expiry.

**G6. The reference-rate source is a compliance question SP02 sends to SP08 that SP08 does not list.**
SP02 U1 owner is "Product owner (legal/compliance via SP08)" (`SP02:244`), but SP08's U7 review scope
is "the VES / USD-cash / Zelle / USDT model, disclosures, privacy notice, and retention"
(`SP08:124`) — no reference-rate source. The dependency dangles.

**G7. Report/incident evidence retention and billing-record retention are two privacy policies with no
shared owner.** SP07 U10 (report evidence, contains PII, `SP07:117`) and SP08 §6 (billing records are
personal data, `SP08:135`) both defer to "operations + backend/legal" separately. Minor, but the
privacy notice the legal review must produce (U7) needs one retention statement.

---

## 5. Consolidated open decisions for this cluster

Re-keyed by decision, not by spike-local `U1…Un` (those collide across reports; `SYNTHESIS.md:68-70`).
Every row is a human decision; none is invented here. "Owner" is the report's own assignment, merged
where two reports name the same decision.

**Eligibility, trust and support**

| # | Decision (in words) | Owner |
| --- | --- | --- |
| E1 | Which contact verification is mandatory to publish — email, phone, both, or none | Product owner (T01); depends on E8 |
| E2 | Whether sellers need identity/KYC beyond contact verification, and the exact wording of any "verified" label | Product owner + legal |
| E3 | The seller-eligibility state set and its transitions, and who may set them | Product owner; executed by T07 |
| E4 | Which reputation signals ship in MVP, and their exact wording | Product owner (T01) |
| E5 | Blocking semantics — one-way vs mutual, account-wide vs per-conversation | Product owner + trust & safety |
| E6 | Moderation roles, evidence retention, the appeal path, and report/safety response SLAs | Operations owner |
| E7 | Retention/privacy policy for report and incident evidence (PII) | Operations + backend + legal |
| E8 | Production email/SMS provider selection (and the WebAuthn RP domain) | Product + technical lead |
| E9 | Public-meeting recommendation content, and whether meeting places are user-suggested or curated | Product owner |

**Subscription, billing and compliance**

| # | Decision (in words) | Owner |
| --- | --- | --- |
| S1 | Subscription plan names, prices, charge currency, and plan-based limits | Product owner |
| S2 | Initial payment provider/channel, and the resulting entity/bank arrangement | Product owner + billing |
| S3 | Whether profiles, eligibility and subscription billing are global or market-specific | Product owner (T01) — merges SP07 #7 and SP08 U3, and gates G4 |
| S4 | Access policy when a subscription expires — grace period (if any) and listing rights for already-published offers | Product owner |
| S5 | Renewal model (provider-managed recurrence vs single-period) and refund policy / who authorizes one | Product owner + legal |
| S6 | Whether the seller subscription must use App Store / Google Play billing, and the store commission it implies | Legal advisor + product owner |
| S7 | Jurisdiction-specific review of the remaining model (VES, USD cash, USDT), disclosures, privacy and retention | Legal advisor — **narrowed by constraint (a)** |
| S8 | Sanctions/OFAC screening obligations for the USDT (and any USD) leg, and the SDN/geography policy | Legal advisor + operations |
| S9 | The approved temporary pilot entitlement process (free pilot vs manual ops activation) | Product owner + operations |
| S10 | Billing support workflow — failed renewal, disputed charge, incorrect expiry | Operations + trust & safety (SP07's table must gain this row; gap G5) |

**Pricing, quotes and money**

| # | Decision (in words) | Owner |
| --- | --- | --- |
| P1 | Reference-rate source(s) per pair, and the reference time (publication/quote/cadence/confirmation) | Product owner — legal dependency dangles (gap G6) |
| P2 | How the seller margin is expressed (percentage / spread / fixed) and its allowed bounds and sign | Product owner |
| P3 | Whether the same-currency VES bank → VES cash pair carries a rate or a margin at all | Product owner — resolves C2 |
| P4 | Quote validity window (TTL), refresh policy, and which quote a confirmation binds to | Product owner + backend; contract now T02 (constraint b) |
| P5 | Rounding scale per asset and rounding mode/direction | Product owner |
| P6 | Min/max amount rules (per-offer vs platform vs plan) and numeric bounds | Product owner; plan caps via S1 |
| P7 | Default offer duration, maximum cap, and its relation to the quote TTL | Product owner |
| P8 | Asset identifiers, units, and minor-unit scale for the five remaining pairs | Product owner (with SP01) |

**Pairs, rails and the contract**

| # | Decision (in words) | Owner |
| --- | --- | --- |
| R1 | The rail of the unqualified "VES" leg — physical cash by default, or chosen per offer | Product owner (T01); offer mechanics SP02 — still live after Zelle removal |
| R2 | Whether fully-digital pairs (VES → USDT survives) require an in-person meeting | Product owner + SP07 + SP04 |
| R3 | USDT network/chain, wallet/address handling, confirmations, fees, and the explicit no-custody boundary | Product owner + payments/backend (SP08/SP09/T02) |
| R4 | The canonical pair/rail enum: two-axis `{asset, rail, delivery}` vs a single method enum, and the label values | Product owner (T01) + T02 — this is IM1 |
| R5 | Ordering and trust for irreversible remote legs | Trust & safety (SP07) + SP04 — unowned today (gap G2) |
| R6 | The single quote/terms-version contract: object names and the snapshot field list | **T02** (constraint b); supersedes SP02 U10 and unifies IM4 |

### Decisions the fixed constraints resolve or invalidate

- **Zelle eligibility and legal/commercial use** (SP01 U3, `SP01:119`) — **resolved by (a)**: Zelle is
  out of the MVP, so the question is moot for launch.
- **Part of SP08 U7's review scope** (`SP08:124`, the Zelle portion) — **resolved by (a)**. What
  remains is USDT/OFAC (S8), app-store billing (S6), and privacy/retention (S7).
- **The Zelle enum values** in SP01, SP02, SP06 and SP12 (`SP01:80-83`; `SP02:124,126`; `SP06:94`;
  `SP12:106`) — **dead by (a)**; the pair catalog drops to five (`SYNTHESIS.md:143`).
- **SP02's ownership of the quote/terms-snapshot contract** (`SP02:220-227`, U10 `SP02:253`) —
  **superseded by (b)**; R6 moves to T02.
- **`AGENTS.md:7` and `README.md:7` still list Zelle** in the product context — a documentation
  follow-through, not a spike decision, but it will contradict constraint (a) until updated.

---

## Sources reviewed

- Cluster reports, read in full: `SP01-exchange-pairs.md`, `SP02-pricing-quotes-limits.md`,
  `SP07-seller-eligibility-trust-safety.md`, `SP08-subscription-compliance-launch.md`.
- Adjacent reports cross-checked for interfaces: `SP03-offer-inventory-allocation.md`,
  `SP04-agreement-cancellation-incidents.md`, `SP05-market-geofences-location-privacy.md`,
  `SP06-prompt-to-search-contract.md`, `SP09-technical-feasibility-test-architecture.md`,
  `SP10-mvp-scope-pilot-metrics.md`, `SP11-seller-transaction-history-earnings.md`,
  `SP12-llm-natural-language-search.md`, `SYNTHESIS.md`.
- `docs/spikes/README.md` (protocol and hard rules), `AGENTS.md`, `/tmp/backlog2.md`,
  `docs/flows/search-and-contact.md`.
