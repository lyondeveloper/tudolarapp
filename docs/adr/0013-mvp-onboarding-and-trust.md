# 0013 — MVP onboarding and trust

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group E register rows — mandatory contact verification, reputation signals and KYC
  scope, blocking semantics, moderation roles and SLAs, and global versus market-specific scope
  (`docs/spikes/SYNTHESIS.md:86,90-94`)

## Context

`docs/spikes/SYNTHESIS.md:90-94` carried as open: which reputation signals ship and whether sellers
need identity/KYC beyond contact verification; blocking semantics, moderation roles, evidence
retention, and appeal/response SLAs; and whether contact verification is required to publish — noting
that both delivery providers are unconfigured today. SP07 proposed `SellerEligibility` and a minimal
private-by-construction public profile (`docs/spikes/SYNTHESIS.md:17`), and `docs/spikes/SYNTHESIS.md:86`
carried whether seller profiles and subscription billing are global or market-specific.
`AGENTS.md:9` states the same question remains open.

The product owner answered on 2026-10-17 (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:80-90`:

- **E1 — No contact verification is required to publish in the MVP.** This is a documented pilot
  relaxation, because both delivery providers are unconfigured. The obligation to verify before public
  launch is recorded in this ADR.
- **E2 — No reputation signals in the MVP**: no ratings, no badges, no KYC beyond nothing. Every signal
  the platform lacks is one it cannot misrepresent as safety.
- **E3 — Blocking is mutual and account-wide.**
- **E4 — Moderation is manual review with an appeal path.** Roles, evidence retention, and response
  SLAs are recorded as owner-set placeholders rather than invented numbers.
- **E5 — Profiles and billing are global, not market-specific.** There is one market in the MVP.

The group G legal questions are **review inputs, not clearances**: qualified counsel must assess
sanctions screening for USDT/OFAC, privacy and retention for report evidence and any stored location,
and the jurisdictional review of the VES / USD-cash / USDT model. This ADR makes none of those legal
determinations.

## Consequences

- **E1 is a pilot relaxation, not the target.** The obligation is recorded here: contact verification
  must be required before **public launch**, once the delivery providers are configured
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:82-84`).
- **E1 relaxes the contact-verification step only; it does not remove ADR-0006's gate.** Publishing
  still requires seller eligibility AND subscription entitlement, composed in the offer-publish use
  case from two ports (`docs/adr/0006-publish-authorization-composition.md:27-37`). SP07's eligibility
  progression reaches `eligible` without the `contact_verified` step in the MVP; the eligibility gate
  itself is unchanged. (See the incoherence note below.)
- **E4's roles, evidence retention, and SLAs stay owner-set placeholders** — no number is invented here
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:88-89`).
- **E5 closes the global-versus-market-specific question** for profiles and billing: both are global,
  and there is one market in the MVP (`docs/spikes/SYNTHESIS.md:86`; `AGENTS.md:9`).
- The group G legal topics above remain open for counsel; recording them here does not imply
  compliance, legal advice, or clearance.
- Left open (unchanged): group **G** (the legal review — privacy and retention for report evidence) and
  group **I** (pilot) remain open (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

### Incoherence note: E1 and ADR-0006

E1 and ADR-0006 are not contradictory — ADR-0006 fixes *what composes the gate* (eligibility AND
entitlement), and E1 relaxes *one prerequisite of eligibility* for the pilot — but the interaction is
worth flagging: with contact verification not required to publish, SP07's `SellerEligibility` step
`contact_verified` has no input in the MVP, so the eligibility gate reduces to "not suspended/rejected".
This is a deliberate pilot relaxation, not a defect, but an implementer should not read E1 as removing
the eligibility port.

## Alternatives considered

- **Requiring contact verification (email, phone, or both) to publish in the MVP.** Rejected for the
  pilot: both delivery providers are unconfigured, so the requirement could not be honoured; the
  obligation moves to pre-launch instead (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:82-84`;
  `docs/spikes/SYNTHESIS.md:93-94`).
- **Shipping reputation signals (ratings, badges, KYC) in the MVP.** Rejected: no reputation signals
  ship, because every signal the platform lacks is one it cannot misrepresent as safety
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:85-86`).
- **One-sided or per-offer blocking.** Rejected: blocking is mutual and account-wide
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:87`).
- **Inventing moderation roles, retention, and SLAs.** Rejected: they are owner-set placeholders
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:88-89`).
- **Market-specific profiles and billing.** Rejected: profiles and billing are global; there is one
  market in the MVP (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:90`).
