# SP07 — Define Seller Eligibility, Trust, Safety, and Support Operations

## 1. Task and acceptance criteria

Quoted from the backlog snapshot (`/tmp/backlog2.md:71–75`):

> ### SP07 — Define Seller Eligibility, Trust, Safety, and Support Operations
> **Suggested owner:** Product + trust/safety + operations. **Depends on:** T00; independent spike, parallelizable.
> - Define seller eligibility and contact/identity verification requirements, privacy boundaries for profiles and locations, and protections against misleading inventory claims.
> - Specify report, block, no-show, fraud/safety incident, moderation, appeal, and support workflows; define which user actions are available without implying the platform can enforce an offline exchange.
>
> **Acceptance criteria:** an operational workflow names roles, evidence, user-visible outcomes, escalation, and response expectations; safety language does not imply verification guarantees an exchange is safe.

This spike is research only. It presents options; the product owner decides which signals are required and what the policy is.

## 2. Evidence and sources

### Observed (read in the repository)

- **Nothing for SP07 exists yet.** The API holds only the `auth/` and `users/` modules (`apps/api/src/**`), and the T00 audit records T07–T14 (seller profile, subscriptions, offers, search, chat, exchanges, trust & safety) as **"Not implemented"** (`docs/audit/t00-baseline.md:214`, §2.8). There is no seller-profile, report, block, moderation, or support code, table, or endpoint to build on.
- **The identity model already carries the fields a profile would draw from.** `AccountStatus = 'pending_email' | 'active' | 'suspended'`, and `User` has `displayName, username, email, emailVerifiedAt, phoneE164, phoneVerifiedAt, accountStatus` (`apps/api/src/auth/domain/user.ts:1–14`). `AuthenticatedUser` adds `passwordHash` and `authMethods` (`:16–19`).
- **The current private view is the boundary to protect.** `CurrentUserView` exposes `email`, `phoneNumber`, `emailVerified`, `phoneVerified`, `authMethods` (`apps/api/src/users/application/current-user.view.ts:6–16`), mapped in `UsersService.getCurrentUser` (`apps/api/src/users/application/users.service.ts:11–21`) and served only on the authenticated `GET /users/me` (`apps/api/src/users/adapters/in/http/users.controller.ts:11–16`). None of this is a public profile; no public endpoint exists.
- **Contact verification is implemented as verification, not identity.** Verified email is used for email sign-in and recovery; phone is a contact factor only (`README.md:31`, `docs/flows/authentication.md:38–43`). The API exposes `POST /auth/email/verify` (`auth.controller.ts:53–58`) and a phone-OTP controller with request/verify and per-route throttles (`auth.controller.ts:161–189`), backed by `EmailDeliveryPort`/`SmsDeliveryPort` (`apps/api/src/auth/application/auth.ports.ts:160–170`) and phone-challenge repository methods (`:96–113`). e2e covers phone verification and the private DTO (`apps/api/test/auth.e2e-spec.ts:157–183`).
- **Safety language is already constrained by the docs.** "Verification must not be presented as a guarantee that an exchange is safe" (`README.md:22`); "Do not imply that verification/KYC, meeting safety, or badges guarantee a safe exchange" (`AGENTS.md:15`); "Profile verification, KYC, and badges must not promise that an in-person exchange is safe" (`docs/flows/seller-offer-lifecycle.md:35`); safety/reputation guidance to show approximate areas, recommend public places, allow reports/blocking, and label paid promotion (`docs/flows/search-and-contact.md:49–55`).
- **Eligibility is validated per operation, and market selection is not authorization.** `AGENTS.md:9` and `docs/architecture.md:50` require the API to validate seller eligibility and resource-market consistency on every operation.
- **Publishing is gated by eligibility and entitlement.** `docs/flows/seller-offer-lifecycle.md:6,30–33` shows "Verify contact / seller requirements *(to be defined)*" before a plan and publishing, and T09 requires an offer cannot be published without an eligible seller and active entitlement (`/tmp/backlog2.md:180`). T07's acceptance criterion is "public profile does not expose private data; server enforces eligibility when publishing an offer" (`/tmp/backlog2.md:167`).
- **Reports, blocking, and public-meeting guidance are already named MVP scope.** `README.md:22` lists "public-meeting recommendations, reputation, blocking, and reports"; T14 owns reporting, blocking, moderation, ratings only after a completed exchange, and non-guaranteeing safety copy (`/tmp/backlog2.md:207–212`).
- **The incident concept is defined by SP04.** No-show, payment, and safety incidents are recorded distinctly from completion, and a reservation may be released after an incident (`/tmp/backlog2.md:56,203`). SP07's safety workflows should reuse that concept rather than invent a parallel one.
- **The approval flow already treats ratings as conditional.** Ratings are allowed "only under the defined conditions, for example after a completed exchange" (`/tmp/backlog2.md:210`), so a reputation signal is not free-floating and must be tied to a recorded outcome.
- **The e2e foundation is the gate for any later implementation.** `docs/testing/e2e.md` and `openspec/specs/testing/e2e-foundation/spec.md`. Any eligibility/report/block behavior this spike motivates must add scenarios before implementing, and cannot be Done until they pass.

### Assumed (not verified in this spike)

- The approved Stitch design's exact profile/report screens and copy (not read here; T15 owns that mapping).
- Whether production email/SMS providers will exist at pilot time; today both default to `unavailable` (`docs/audit/t00-baseline.md:194–195`).
- Support staffing, response times, and escalation contacts — these are operational facts the product owner/operations must supply, not inferable from the repository.

## 3. Options considered

Each option lists pros, cons, and why it was kept or rejected. Options marked **"Presented, not decided"** are product-owner calls; this spike only frames them.

**A. Public profile content.** (A1) Minimal: `displayName` + approved verification/eligibility labels + reputation. (A2) Rich: bio, joined date, completed count, languages, zone.
- *A1 pros:* smallest privacy surface; matches the existing private/`public` split; easy to test that private fields never appear. *A1 cons:* less seller self-expression.
- *A2 pros:* more trust context. *A2 cons:* larger PII surface and more copy to keep non-guaranteeing.
- **Kept:** A1 as the default; A2 fields only if the owner opts in, and still excluding the private fields in `CurrentUserView`. **Rejected:** exposing `email`/`phoneE164`/`accountStatus`/`authMethods` publicly — private today, and phone is a contact factor, not a public attribute.

**B. Seller eligibility model.** (B1) Reuse `AccountStatus` (`pending_email|active|suspended`). (B2) A separate `SellerEligibility` state (illustratively `none → contact_verified → eligible → suspended/rejected`).
- *B1 pros:* no new state; one concept. *B1 cons:* conflates authentication with publishing rights; cannot express "active account but not yet eligible" or "eligible but paused".
- *B2 pros:* a distinct publish gate for T09; a seller-visible status separate from login. *B2 cons:* one more model and migration.
- **Kept:** B2. **Rejected:** B1 alone — a suspended *account* and a seller who has not verified contact are different conditions with different outcomes.

**C. Contact verification required to publish.** (C1) verified email only; (C2) verified email **and** verified phone; (C3) phone only; (C4) none.
- **Presented, not decided** — a T01 product decision (`/tmp/backlog2.md:111`). Both verifications exist, so any option is implementable, but both providers are `unavailable` today, which makes a mandatory-contact rule a launch dependency, not just a policy choice.

**D. Reputation signals.** (D1) Star ratings. (D2) Completed-exchange count only. (D3) No public reputation in MVP. (D4) Verification/KYC badges.
- **Presented, not decided.** Any kept signal must carry the disclaimer that it does not guarantee safety (`AGENTS.md:15`); a badge is a signal, not a safety promise. Ratings are additionally constrained to follow a completed exchange (`/tmp/backlog2.md:210`).

**E. Protection against misleading inventory claims.** (E1) Persistent disclaimer that listed inventory is seller-declared and not escrowed/verified. (E2) Hide/flag offers after repeated complaints. (E3) Require the seller to re-affirm availability.
- **Kept:** E1 as a baseline (already implied by `docs/flows/search-and-contact.md:52–53`); E2/E3 are moderation options owned by the policy. **Rejected:** any wording implying the platform verifies or holds the funds.

**F. Enforcement point.** (F1) Controller check. (F2) Application use case + eligibility port, with a DB constraint where the DB can enforce the invariant.
- *F1 pros:* quick. *F1 cons:* business rule in the transport layer; untestable as a domain invariant.
- *F2 pros:* thin controllers, testable invariant, matches the hexagonal rules (`AGENTS.md:66,70`; `openspec/config.yaml:15–19`). *F2 cons:* a little more wiring.
- **Kept:** F2. **Rejected:** F1.

**G. Blocking semantics.** (G1) One-way (blocker stops seeing/being contacted by the blocked user). (G2) Mutual. (G3) Block scoped to an offer/conversation vs account-wide.
- **Presented, not decided** — affects chat/report permissions (T12/T14).

**H. Moderation & appeal.** (H1) Manual review queue only. (H2) Automated heuristics + manual review. (H3) No formal appeal.
- *H1 pros:* simple, auditable, fits pilot scale. *H1 cons:* does not scale.
- *H2 pros:* scales. *H2 cons:* premature at pilot scale; adds a decisioning system to explain and audit.
- **Kept:** H1 as the MVP baseline **with** an appeal path; H3 rejected — an appeal needs an owner, evidence retention, and a user-visible outcome to satisfy the acceptance criteria.

**I. Public-meeting guidance.** Present recommended public places and precautions and state the service boundary (`docs/flows/search-and-contact.md:51–53`); never claim the platform enforces or witnesses the meeting.

**J. Identity verification depth.** (J1) Contact verification only (email/phone), as the approved MVP design implies (`README.md:31`). (J2) Add government-ID/KYC verification for sellers.
- *J1 pros:* already implemented, low friction, no new provider, no PII collection beyond email/phone. *J1 cons:* does not establish a legal identity, so "verified" must be worded narrowly.
- *J2 pros:* stronger accountability against fraud/counterfeit. *J2 cons:* new provider, new PII/retention obligations (`AGENTS.md:52`), legal review, and a false sense that identity guarantees safety — exactly the guarantee the docs forbid (`AGENTS.md:15`). Also outside the approved MVP design (`README.md:31`).
- **Kept:** J1 for the MVP, with any J2 addition as an owner decision (not this spike). **Rejected as a default:** J2, on cost, privacy, and the safety-guarantee risk.

## 4. Recommendation

- **Model seller eligibility as its own state**, separate from `AccountStatus`, and enforce the publish gate server-side in the offer use case (B2/F2). Expose eligibility to the seller privately; expose only the owner-approved labels on the public profile.
- **Default the public profile to a minimal, private-by-construction view** (A1): `displayName`, approved verification/eligibility labels, and the owner-approved reputation signal. Explicitly exclude `email`, `phoneE164`, `accountStatus`, `authMethods`, precise location, and any home address — consistent with `docs/flows/search-and-contact.md:51`.
- **Keep contact verification as verification** (email/phone as in `docs/flows/authentication.md`); present options C1–C4 for the owner to require at publish time, and treat a mandatory rule as dependent on configuring a real provider.
- **Carry a non-safety disclaimer everywhere a signal appears**: verification, eligibility labels, and reputation do not guarantee a safe exchange (`AGENTS.md:15`).
- **Define report/block/no-show/incident/moderation/appeal as one support workflow** with named roles, evidence retained, user-visible outcomes, escalation, and response expectations (table below), reusing the incident concept from SP04.
- **Keep the platform's user actions to discovery, contact, coordination, reporting, blocking, and moderation**; no action should imply the platform can compel or enforce an offline exchange.

### Proposed support workflow (roles, evidence, outcomes, escalation, response) — options for the owner

Every column except the workflow name is a proposal to be confirmed; the **owner** column names who decides.

| Workflow | Trigger | Role (owner) | Evidence retained | User-visible outcome | Escalation | Response expectation |
| --- | --- | --- | --- | --- | --- | --- |
| Report | User reports an offer/user (reason + free text) | Reporter; Moderation queue | Report row, reason, timestamp, subject id | Reporter sees "received"; subject may see the outcome if action taken | Auto-escalate safety/fraud reports | *Owner-set SLA* |
| Block | User blocks another user | Blocker; Chat/Offer permissions | Block row (blocker, blocked, scope) | Blocked party cannot contact or view, per approved semantics | — | Immediate |
| No-show / incident | Either party flags a no-show, payment, or safety concern | Both parties; Moderation | Incident row linked to the exchange record (SP04) | Reservation policy applied; no completion recorded | Safety incidents to Moderation | *Owner-set SLA* |
| Fraud / counterfeit report | Report tagged fraud/counterfeit cash | Moderation (trust & safety) | Report + incident + any offer/exchange context | Decision shown to the affected user | Escalate to the trust & safety lead | *Owner-set SLA* |
| Moderation action | Reviewer acts on a report | Trust & safety reviewer | Decision, reason, actor, timestamp | Subject sees the action and its reason | Reviewer → trust & safety lead | *Owner-set SLA* |
| Appeal | Affected user contests a decision | Appeals reviewer (≠ first reviewer) | Original decision + appeal text | Reviewer records a final outcome | Appeals reviewer → product owner | *Owner-set SLA* |
| Support recovery | Passkey-only user loses every passkey | Support (audited) | Audit log of the recovery | Account access restored per policy | Support → security | Per `docs/flows/authentication.md:43` |

Roles, evidence, and outcomes are grounded in the docs; the **response expectations are deliberately left as owner-set placeholders**, because no repository source states a response time and inventing one would violate the no-invented-rules rule.

## 5. Unresolved decisions (each with an owner)

1. **Which contact verification is mandatory to publish** (C1–C4). — *Product owner (T01).*
2. **Which reputation signals ship in MVP** (D1–D4) and their exact wording. — *Product owner (T01).*
3. **Blocking semantics**: one-way vs mutual, and account-wide vs per-conversation. — *Product owner + trust/safety.*
4. **Eligibility states and transitions** the owner approves (names, who can set them, re-eligibility). — *Product owner; executed by backend (T07).*
5. **Moderation roles, evidence retention, and appeal SLA** (who reviews, how long evidence is kept, response targets). — *Operations owner.*
6. **Response expectations / SLAs** for reports and safety incidents. — *Operations owner.*
7. **Whether profiles and billing are global or market-specific** (affects whether eligibility is per market). — *Product owner (already open, `README.md:27`).*
8. **Provider selection** for email/SMS that makes any mandatory-contact rule possible. — *Product + backend (T06/T08).*
9. **Public-meeting recommendation content** and whether meeting places are user-suggested or curated. — *Product owner.*
10. **Retention/privacy for report evidence** (contains PII). — *Operations + backend, per `AGENTS.md:52`.*
11. **Whether sellers need identity/KYC beyond contact verification** (J1 vs J2), and the exact wording of any "verified" label. — *Product owner + legal advisor.*

## 6. Product and technical impact

**Product.** Adds a seller-facing eligibility/onboarding step and a buyer-facing public profile, report/block controls, and a support/moderation surface. Safety copy must be reviewed against `AGENTS.md:15`. Reputation and eligibility labels become product-visible and must be worded as signals, not guarantees. A mandatory-contact rule (option C) would block publishing until a real email/SMS provider is configured, so it interacts with T06/T08 and the launch checklist.

**Technical (target architecture only — nothing is implemented by this spike).**
- A new hexagonal module (e.g. `apps/api/src/sellers/` or `trust-safety/`) with `domain/` (eligibility states/invariants), `application/` (publish-gate use case, report/block use cases, ports), `adapters/in/http/` (public profile, report, block endpoints), and `adapters/out/` (persistence). Eligibility is enforced inside the offer-publish use case (T09), not the controller (`AGENTS.md:66,70`).
- New Prisma models (seller eligibility, reports, blocks, moderation actions, appeals) as explicit migrations; `CHECK` constraints where the DB can enforce a state (`AGENTS.md:39,43`). Evidence with PII needs least-privilege access and retention (`AGENTS.md:51–52`).
- A distinct **public profile DTO** that never reuses `CurrentUserView` (`apps/api/src/users/application/current-user.view.ts:6–16`), so private fields cannot leak by accident.
- Server-side authorization on every report/block/moderation operation, including ownership and scope checks (`AGENTS.md:72`), and rate limits on report/block endpoints as on the auth routes (`auth.controller.ts:32,45,167`).
- Mobile: RTK Query slices for profile/report/block (`AGENTS.md:90–91`); gluestack amber safety notices per the design system (`openspec/specs/mobile/design-system/spec.md:25–28`).
- E2E: add scenarios before implementing behavior, following `docs/testing/e2e.md`; T07/T14 own the coverage, and the T-1 foundation gate applies.

## 7. Testable scenarios

- **WHEN** a seller without the required contact verification attempts to publish an offer **THEN** the API rejects it and the offer stays a draft, regardless of client state.
- **WHEN** a seller is suspended/rejected **THEN** publishing is blocked and existing offers follow the owner-approved policy.
- **WHEN** a buyer opens a public seller profile **THEN** the response contains only approved public fields and never `email`, `phoneE164`, `accountStatus`, or `authMethods`.
- **WHEN** any verification/eligibility/reputation signal is displayed **THEN** it is accompanied by text stating it does not guarantee a safe exchange.
- **WHEN** a user reports another user or an offer **THEN** the report is recorded with the reported party, reason, and timestamp, and the reporter sees a defined outcome.
- **WHEN** a user blocks another **THEN** the blocked party cannot start a conversation or view the blocker's offers, per the approved block semantics.
- **WHEN** a no-show or safety incident is recorded **THEN** it is stored distinctly from a completed exchange and does not imply the exchange occurred (`/tmp/backlog2.md:203`).
- **WHEN** a moderation decision is made **THEN** the affected user can see the outcome and has an appeal path, with the decision and evidence retained.
- **WHEN** a user appeals a decision **THEN** a reviewer other than the original one records a final outcome.
- **WHEN** the app shows meeting guidance **THEN** it recommends public places and states the platform does not custody funds or enforce the exchange.
- **WHEN** a seller's listed inventory is shown **THEN** it is presented as seller-declared and not verified or escrowed.
- **WHEN** the same user selects a different market **THEN** seller eligibility is re-evaluated for that market and is not inherited from the previous selection.
- **WHEN** a client-side flag claims a seller is eligible **THEN** the server still enforces eligibility and rejects the publish if it disagrees.

## 8. Sources reviewed

- `AGENTS.md` (product context, PostgreSQL/PostGIS, NestJS hexagonal, security rules).
- `/tmp/backlog2.md` — SP07 (§71–75), SP04 (§53–58), SP10 (§89–91), T01 (§106–116), T07 (§162–167), T09 (§175–180), T14 (§207–212).
- `docs/spikes/README.md` (protocol).
- `README.md`, `docs/architecture.md`, `docs/flows/authentication.md`, `docs/flows/search-and-contact.md`, `docs/flows/seller-offer-lifecycle.md`, `docs/testing/e2e.md`, `docs/audit/t00-baseline.md`.
- `openspec/config.yaml`, `openspec/specs/testing/e2e-foundation/spec.md`, `openspec/specs/mobile/design-system/spec.md`.
- `apps/api/src/auth/domain/user.ts`, `apps/api/src/auth/application/auth.ports.ts`, `apps/api/src/auth/adapters/in/http/auth.controller.ts`, `apps/api/src/users/application/current-user.view.ts`, `apps/api/src/users/application/users.service.ts`, `apps/api/src/users/adapters/in/http/users.controller.ts`, `apps/api/src/users/adapters/in/http/current-user.dto.ts`, `apps/api/test/auth.e2e-spec.ts`.
