# 0016 — Selling is a state, not an account type

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** an earlier MVP convenience in which an `accountType` of `seller` or `buyer` would be
  added to the user model (`openspec/changes/t01-product-decisions/design.md:30-44`)

## Context

The MVP needs two kinds of account to demonstrate the both-sides loop: one that can publish an offer
and one that can find it. The first proposal was an **`accountType` of `seller` or `buyer`** on the
user model — a convenience that would seed `SellerEligibility` and let a demo hand one phone to each
side (`openspec/changes/t01-product-decisions/design.md:34-44`).

That proposal collided with **ADR-0006**, which settles three distinct concepts with three distinct
names: `AccountStatus` (may this account sign in), `SellerEligibility` (may this seller publish), and
entitlement (is the subscription active). Under that model, selling is a **state a person reaches**,
not a kind of account they are — and in the real product one person may both buy and sell. An
exclusive account type would make that impossible and would become a fourth authorization concept
competing with the three ADR-0006 deliberately separated.

The product owner reconsidered and confirmed the state model
(`openspec/changes/t01-product-decisions/design.md:30-44`).

## Decision

**No `accountType` field is added to the user model.** Selling remains a **state**:

- A user's ability to publish comes from `SellerEligibility` plus entitlement, composed in the
  offer-publish use case from two ports, exactly as **ADR-0006** specifies.
- **No permission is ever granted from a user attribute.** Eligibility is checked server-side on every
  publish, not inferred from how an account was created.
- For the MVP, the two demo accounts differ **by seeded eligibility**: the seller account has an
  eligible `SellerEligibility` row, the buyer account does not. That gives the demonstration its two
  phones without introducing a new concept.

## Consequences

- The demo still works: one account can publish, another cannot, and the difference is visible in the
  data rather than baked into the account.
- **A buyer who becomes a seller needs no new account** — eligibility changes, and nothing else does.
  This is the behaviour the real product needs, and it is now the behaviour the MVP has.
- The publish gate stays honest: with no account type to lean on, an implementer cannot accidentally
  authorize from it.
- Revisit trigger: none. This decision does not need revisiting when subscriptions land, because it
  *is* the model subscriptions will attach to — entitlement becomes the second input of the same gate
  (ADR-0014).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **An `accountType` of `seller` or `buyer` on the user model.** Rejected by the product owner: it
  makes selling an identity rather than a state, prevents one person from both buying and selling,
  and adds a fourth authorization concept alongside the three ADR-0006 separates.
- **A `role` column used only for display, never for authorization.** Rejected as the same field with
  a smaller promise: a display role that mirrors eligibility is a second source of truth that can
  drift from `SellerEligibility`, and the UI can read eligibility directly.
- **Two separate user tables or account kinds.** Rejected outright: identity and authentication are
  global (`AGENTS.md:9`), and splitting them would fragment sessions, passkeys, and contact
  verification for no gain.
