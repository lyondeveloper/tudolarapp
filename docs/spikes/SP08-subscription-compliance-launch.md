# SP08 — Validate subscription, compliance, and launch operations

Research-only spike. No application code, schema, or configuration was changed, and no command that
mutates the repository was run. Provider choice and pricing are the product owner's decisions; this
report presents options and marks them unresolved rather than choosing them.

## 1. Task and acceptance criteria

Quoted from the backlog snapshot at `/tmp/backlog2.md`, lines 76–80:

> ### SP08 — Validate Subscription, Compliance, and Launch Operations
> **Suggested owner:** Product + billing + operations/legal advisor. **Depends on:** T00; independent spike, parallelizable.
> - Decide seller subscription plans, payment provider/channel, renewal/cancellation/refund behavior, grace period, and listing rights after expiry; preserve zero per-exchange commission.
> - Obtain jurisdiction-specific review of the proposed VES, USD cash, Zelle, and USDT marketplace model, disclosures, privacy, and operational responsibilities. Do not invent legal conclusions or simulate successful payments.
> **Acceptance criteria:** a documented launch recommendation identifies approved billing behavior, required legal review, launch blockers, and any explicitly approved temporary pilot process.

Constraints that bound this spike, quoted from the same snapshot:

- Line 112 (T01): "Subscription plans, initial payment provider/channel, and access policy when a subscription expires. Keep the platform's per-exchange commission at zero, distinct from the seller-set margin/commission on their offer."
- Lines 168–174 (T08): "Implement monthly seller plans according to T01 and the approved provider. … Model statuses, expiry, renewal, cancellation, and idempotent events/webhooks. … If the provider is not ready for the MVP, use only the approved temporary mechanism and do not simulate successful payments. … Do not introduce a per-exchange commission." Acceptance criteria: "backend determines publishing rights from subscription status; duplicate webhooks do not duplicate effects; expiry/cancellation cases tested; payment collection and scope documented."
- Line 180 (T09): "an offer cannot be published without an eligible seller and active entitlement … seller commission/margin field is persisted and displayed, distinct from platform commission".
- Line 19 (T-1 gate): "Do not invent behavior for features that do not exist, use production credentials, or simulate successful external payments."

## 2. Evidence and sources

### 2.1 Observed in the repository

| Source | What it establishes |
| --- | --- |
| `README.md:15` | "No per-exchange commission is planned. Proposed plan prices and benefits are hypotheses to validate, not final pricing." |
| `README.md:23,55` | Subscriptions are MVP scope item 5; "No mobile client or market management/service-area persistence, offers, search, chat, subscriptions, or exchange records are implemented yet." |
| `README.md:27` | "Whether seller profiles and subscription billing are global or market-specific remains open." |
| `README.md:54` | Production email/SMS providers not selected; WebAuthn RP domain and iOS/Android associations unconfigured. |
| `AGENTS.md:7,9` | Buyers free, seller subscriptions instead of per-exchange commissions; billing scope open; "the API validates market scope and seller eligibility on every operation". |
| `AGENTS.md:45,46` | Monetary amounts as `numeric`/minor units with defined scale/rounding/currency; one transaction per atomic business operation, never held open across network calls. |
| `AGENTS.md:51,52,73,75` | Least-privilege secrets, startup config validation, retention/backup+restore obligations, controlled errors that leak no provider internals. |
| `AGENTS.md:71,72` | `whitelist`/`forbidNonWhitelisted` DTO validation; authorize every operation on every resource server-side. |
| `docs/flows/seller-offer-lifecycle.md:30–35` | "Sellers pay a fixed monthly plan; limits and priority are enforced by the backend"; "Publish only offers that pass domain validation, plan limits …"; billing scope open; Basic/Pro prices are hypotheses; verification must not promise safety. |
| `docs/architecture.md:14,46,53` | `Offers and subscriptions` is an API module; PostgreSQL, email, SMS, LLM adapters live in infrastructure; the marketplace does not custody or settle funds. |
| `docs/testing/e2e.md:12–13,58` | Two e2e entry points (`npm run test:e2e -- --runInBand` in `apps/api`; `npm run e2e` in `apps/mobile`) and the pattern for adding a scenario. |
| `docs/testing/e2e.md:98–108` | "There is no CI in this repository"; the API suite needs a PostGIS service container, the mobile flows a macOS runner. |
| `openspec/specs/testing/e2e-foundation/spec.md:25–29` | The harness "SHALL provide the fixture data a scenario needs without depending on an unavailable external provider." |
| `openspec/specs/testing/e2e-foundation/spec.md:37–41` | Precedent: "A scenario gets a verified account without email delivery … the harness provides one directly, without going through email delivery, which is unconfigured outside tests." |
| `apps/api/src/config/env.validation.ts:107–108,132–136,147–148` | Delivery mode is `test` or `unavailable` only; the app refuses to start in production while either delivery adapter is unavailable. |
| `apps/api/src/auth/application/auth.ports.ts:160–170` | The existing external-boundary pattern: a port with a `readonly available` flag plus a test adapter — the shape a billing port should mirror. |
| `openspec/config.yaml:46–48,58–59` | A design that crosses an external boundary must "name the port and the outbound adapter"; one migration runner (Prisma). |
| `docs/audit/t00-baseline.md:120–121` | The Prisma schema declares 6 models (all identity/session); no subscription, plan, payment, or webhook model exists. |
| `docs/audit/t00-baseline.md:194–195,447,454` | Email/SMS unconfigured; F-1 (GitHub write access denied) and F-8 (24 API / 25 mobile dependency advisories, every fix breaking) are open, non-blocking debt. |

### 2.2 Observed outside the repository (URLs)

- **Zelle is contractually personal-use, not commercial.** Zelle Network Standard Terms: "The Service is intended for personal, not business or commercial use. You agree that you will not use the Service to send or receive payments in connection with your business or commercial enterprise." (https://allianceccu.com/wp-content/uploads/2025/01/Zelle-Terms-Conditions.pdf). PNC's Zelle terms add: "THE SERVICE IS NOT INTENDED FOR THE PURCHASE OF GOODS FROM RETAILERS, MERCHANTS, OR OTHER SELLERS, INCLUDING ON OR THROUGH SOCIAL MEDIA OR SOCIAL MEDIA MARKETPLACES OR MESSAGING APPS" (https://www.pnc.com/content/dam/pnc-com/pdf/smallbusiness/zelle/zelle-terms-of-use.pdf). Chase's Zelle Service Agreement likewise grants use "for your personal use or, if you are a business, internal business purposes only" and excludes commercial use (https://static.chasecdn.com/content/dam/legal-agreements/library/en/chasenet%5Fla/versions/chasenet%5Fla.pdf). Zelle site terms restrict the *site* licence to personal, non-commercial use (https://www.zelle.com/legal/site-terms-use).
- **Venezuela's exchange-control law was derogated in 2018.** Decreto Constituyente derogating the "Régimen Cambiario y sus Ilícitos", Gaceta Oficial Nº 41.452, effective 2 August 2018, "con el propósito de otorgar a los particulares … las más amplías garantías para el desempeño de su mejor participación" (https://rnv.gob.ve/publican-en-gaceta-oficial-la-derogacion-de-ley-de-ilicitos-cambiarios/; https://investmentpolicy.unctad.org/investment-policy-monitor/measures/3322/venezuela-bolivarian-republic-of-legalizes-money-exchanges). The superseded instrument is Decreto Nº 2.167, Ley del Régimen Cambiario y sus Ilícitos, G.O. 6.210 Ext., 30/12/2015 (https://www.asambleanacional.gob.ve/leyes/sancionadas/decreto-n0-2167-mediante-el-cual-se-dicta-el-decreto-con-rango-valor-y-fuerza-de-ley-del-regimen-cambiario-y-sus-ilicitos). BCV publishes a reference rate and banking-system buy/sell rates (https://www.bcv.org.ve/marco/leyes-normativa-macroeconomica).
- **US sanctions touch the model.** OFAC's Venezuela Sanctions Regulations, 31 CFR part 591, implement E.O. 13692 and six later orders; SDN designations are the operative list (https://www.ecfr.gov/current/title-31/subtitle-B/chapter-V/part-591; https://www.federalregister.gov/documents/2019/11/22/2019-25343/venezuela-sanctions-regulations).
- **App stores regulate digital subscriptions.** Apple guideline 3.1.1 In-App Purchase requires unlocking features and functionality through IAP (https://developer.apple.com/app-store/review/guidelines/). Google Play's Payments policy requires Play's billing system for "Subscription services" and "App functionality or content" (https://support.google.com/googleplay/android-developer/answer/10281818). Google Play's own subscription states are documented as Active, Cancelled (access until expiry), In grace period, On hold, Paused, and Expired (https://developer.android.com/google/play/billing/integrate).
- **Webhook idempotency is a documented provider-side problem.** Stripe: "Webhook endpoints might occasionally receive the same event more than once … guard against duplicated event receipts by logging the event IDs you've processed"; event order is not guaranteed and `created` must not be used to order or dedupe (https://docs.stripe.com/webhooks); the manual-recovery script must skip already-processed events and return `200` to stop retries (https://docs.stripe.com/events/manage-webhook-endpoints); request-side retries use an idempotency key, ≤255 chars, not containing personal data (https://docs.stripe.com/api/idempotent_requests).
- **International PSP availability.** Stripe supports business accounts in 46 countries and Venezuela is not among them (https://stripe.com/global). Two secondary sources claim Mercado Pago does not operate in Venezuela (https://www.kambalach.com/blog/mercadolibre-vs-kambalach, a competitor blog; https://vexwallet.co/vexpay/alternativas/stripe, a vendor marketing page) and that local collection runs through Pago Móvil, bank transfer in VES, Zelle, Binance Pay/USDT, or cash. **Treat both as unverified leads, not facts.**

### 2.3 Assumed, not verified

- That no billing or payment capability exists anywhere in the repository: verified negatively only for the six Prisma models and the module inventory in `docs/audit/t00-baseline.md:95–127`; no payment, webhook, or entitlement symbol was found outside documentation.
- That a monthly recurring charge is feasible for a Venezuelan seller: the provider research above is secondary and unverified. This is exactly why the recurring-vs-single-period choice is left open (§5).
- That app-store billing rules apply to TUDOLAR's seller subscription. The guidelines quoted say they apply to apps distributed through those stores that unlock functionality; whether TUDOLAR's subscription is a "digital good" for each store, and whether any exception applies, is a legal question, not an engineering finding.
- Any conclusion about the legality of the VES/USD-cash/Zelle/USDT model. Nothing in §2.2 is a legal opinion, and none is offered.

## 3. Options considered

### 3.1 Where the entitlement gate lives

- **A — Derive entitlement on read from stored subscription state (kept).** A pure domain function `entitlement(subscription, now)` evaluated server-side by every operation that needs it. Pros: single source of truth, no drift, "backend determines publishing rights from subscription status" (T08 acceptance), consistent with `AGENTS.md:9`. Cons: one extra join/read per gated operation. Kept.
- **B — Denormalized `isActive` boolean on the seller profile (rejected).** Pros: cheapest read. Cons: two sources of truth; drifts when a webhook or expiry job fails, which is precisely the failure the acceptance criterion guards against; contradicts `AGENTS.md`'s invariant-in-the-database posture.
- **C — Market-scoped subscription rows only (rejected as a premise).** Billing scope (global vs per-market) is explicitly open (`README.md:27`, `AGENTS.md:9`), so the model must not hard-code either. The entitlement function should take the billing scope as a parameter so the T01 decision does not force a rewrite.

### 3.2 Initial payment provider or channel

- **A — Hosted checkout at an international PSP (kept as the reference integration).** Pros: signed webhooks, idempotency keys, hosted card data (no PAN in scope), documented lifecycle. Cons: Venezuela is not a supported merchant country for the one PSP checked; a foreign entity/bank may be required, which itself raises sanctions and tax questions. Kept because it defines the *port shape* even if the concrete provider changes.
- **B — A local Venezuelan gateway settling in VES.** Pros: matches how local buyers pay (Pago Móvil/card), local bank settlement. Cons: unverified availability, heterogeneous webhook/verification quality, and often no documented idempotency — the port must therefore tolerate a provider without reliable event ids.
- **C — Manual collection (bank transfer/Pago Móvil) with an ops-recorded activation.** Pros: usable at pilot scale with no integration; every activation is a human, auditable action. Cons: does not scale, no automatic renewal, and needs an explicit T08 "approved temporary mechanism" (`backlog2.md:172`).
- **D — App-store in-app purchase.** Pros: the store handles recurrence and cancellation; possibly *required* for feature-unlocking subscriptions (Apple 3.1.1, Google Play Payments). Cons: store commission, VES/USD presentment limits, a second entitlement source that must still be reconciled server-side.
- **E — Stablecoin (USDT) payment.** Pros: rails the product already uses. Cons: adds a treasury/custody surface the product explicitly avoids (`AGENTS.md:11`), and sanctions/wallet-screening questions.

No option is chosen: provider choice is the product owner's decision (`backlog2.md:78,112`). The recommendation is only about the *shape* the integration must take.

### 3.3 Recurring vs single-period

- **Recurring (provider-managed auto-renew, kept as the target).** The provider owns dunning, grace, and cancellation; the platform mirrors its states. Cons: depends on option A/B being capable.
- **Single-period purchase with repurchase (kept as the fallback).** Every period is a discrete, idempotent purchase; no auto-charge is ever assumed. Cons: needs its own expiry reminder and a fail-closed expiry path.

### 3.4 Access policy when a subscription expires

- **A — Hard stop at period end (kept as the default to be confirmed).** No new publication; existing active offers are paused/hidden per the approved listing-rights decision; conversations and confirmed exchange records are retained, never deleted. Pros: simple, matches "listing rights after expiry" (`backlog2.md:78`) and "an offer cannot be published without … active entitlement" (T09). Cons: needs a product decision on what happens to already-listed offers.
- **B — Fixed grace period before the hard stop.** Pros: fewer accidental lapses; matches provider dunning semantics. Cons: the *length* is a monetary/product rule no agent may invent.
- **C — Permanent read-only.** Sellers keep history and earnings but cannot publish. Cons: not mutually exclusive with A/B; better expressed as a property of the expired state than as an alternative.

Whatever is chosen, already-confirmed transactions must be unaffected (`backlog2.md:177,180`), and the app must not present subscription status as a safety or verification signal (`AGENTS.md:15`; `docs/flows/search-and-contact.md:55`).

### 3.5 Idempotency mechanism

- **A — Durable dedupe table keyed by provider event id, written inside the same transaction as the state change (kept).** Pros: survives restarts and provider retries; a unique constraint makes the guarantee a database invariant, not application discipline (`AGENTS.md:43`); duplicates return `200` and change nothing, per the provider's own retry semantics. Cons: one extra table and one extra write per event.
- **B — In-memory or cache-based dedupe (rejected).** Loses its memory exactly when a retry storm follows a deploy — the scenario that matters.
- **C — Rely on provider retry/at-least-once semantics (rejected).** The provider explicitly warns duplicates and reordering occur (https://docs.stripe.com/webhooks).

## 4. Recommendation

1. **Model subscriptions in the domain, not in the provider.** A provider-neutral state set — `pending`, `active`, `past_due`, `canceled_at_period_end`, `expired` — with the mapping to the chosen provider's own states decided together with that provider (Google Play's published set is a useful checklist, https://developer.android.com/google/play/billing/integrate). Store `period_start`, `period_end`, `canceled_at`, `provider`, `provider_subscription_id`, and the raw event ledger. **All semantics — which states grant publishing, and any grace length — are unresolved (§5).**
2. **Entitlement is a server-side pure function of stored state plus the server clock**, evaluated at every gated operation (publish, reactivate, and any future plan-limited action) and never trusted from the client. Fail closed: if the state cannot be resolved, publishing is denied rather than allowed.
3. **One billing module with hexagonal boundaries**: `domain/` owns the state machine and the entitlement rule; `application/` owns use cases (`StartSubscriptionCheckout`, `ApplyProviderEvent`, `CancelSubscription`, `ResolveEntitlement`) and the ports; `adapters/in/http/` holds the checkout/cancel endpoints and the **webhook controller**; `adapters/out/` holds the provider client and its persistence. `AGENTS.md:56–68` and `openspec/config.yaml:46–48` require exactly this split.
4. **The webhook is the only place payment facts enter.** Verify the provider signature over the raw body before parsing, reject invalid payloads with `400` and no state change, dedupe on the provider event id inside one transaction, never order events by their timestamp, and re-fetch the subscription from the provider API when an event is ambiguous or out of order. Every write is a compare-and-swap or a guarded `updateMany`, never a read-then-write (`AGENTS.md:41`).
5. **Keep the platform commission at exactly zero.** There is no platform-commission table, field, or calculation anywhere in the billing module. The seller's margin is an offer field owned by SP02/T09 (`backlog2.md:44,180`) and is never read or applied by billing. A completed exchange must produce no platform revenue event.
6. **Never simulate a successful external payment** (`backlog2.md:19,79,172`). Tests reach an active entitlement through a **test-only provider adapter behind the port**, mirroring the existing `EmailDeliveryPort`/`SmsDeliveryPort` shape (`auth.ports.ts:160–170`) and the e2e foundation's precedent of providing fixtures "without depending on an unavailable external provider" (`openspec/specs/testing/e2e-foundation/spec.md:25–29`). That adapter is selected only under `NODE_ENV=test`, is refused in production the way `EMAIL_DELIVERY_MODE=unavailable` already is (`env.validation.ts:132–148`), and no user-facing surface ever reports a payment that did not occur.
7. **Reconcile, do not assume.** A scheduled reconciliation compares stored state with the provider API and logs discrepancies; a webhook body alone never grants entitlement until it is verified and applied idempotently.
8. **Treat the launch blockers in §6 as a checklist**, not as a footnote: several are outside the repository and cannot be closed by an agent.

## 5. Unresolved decisions

| # | Decision | Owner |
| --- | --- | --- |
| U1 | Plan names, prices, currency of charge, and plan-based limits/visibility | Product owner (`backlog2.md:78,112`; `README.md:15`) |
| U2 | Initial payment provider or channel (options 3.2 A–E), and the resulting entity/bank arrangement | Product owner + billing (`backlog2.md:78,112`) |
| U3 | Whether seller subscription billing is global or market-specific | Product owner + architect (`README.md:27`, `AGENTS.md:9`) |
| U4 | Access policy at expiry, including grace period (if any) and listing rights for already-published offers | Product owner (`backlog2.md:78`) |
| U5 | Renewal model: provider-managed recurrence vs single-period repurchase; refund policy and who authorizes one | Product owner + legal advisor |
| U6 | Whether the seller subscription must use App Store / Google Play billing, and the store commission that implies | Legal advisor + product owner (Apple 3.1.1; Google Play Payments policy) |
| U7 | Jurisdiction-specific review of the VES / USD-cash / Zelle / USDT model, disclosures, privacy notice, and retention | Legal advisor (`backlog2.md:79`) |
| U8 | Sanctions screening obligations for any USD or USDT leg, and the SDN/geography policy | Legal advisor + operations (31 CFR 591) |
| U9 | Approved temporary pilot process when the provider is not ready (free pilot entitlement vs manual ops activation) | Product owner + operations (`backlog2.md:80,172`) |
| U10 | Production email/SMS providers and the WebAuthn RP domain + app associations | Product owner + technical lead (`README.md:54`; `docs/audit/t00-baseline.md:188–195`) |
| U11 | Billing support workflow: who handles a failed renewal, a disputed charge, or an incorrect expiry, and the response expectation | Operations + trust & safety (SP07 owns the general workflow) |

> **Correction — `docs/adr/0006-publish-authorization-composition.md` (spike-interface-reconciliation).**
> (1) Entitlement's role in the publish gate is settled: publishing requires **seller eligibility AND
> subscription entitlement**, and the gate is **composed in the offer-publish use case from those two
> ports** — not in the controller and not inside either module. Entitlement remains the pure function
> of stored state plus the server clock described in §4.2; it is **one of the two gate inputs**, not
> the whole gate.
> (2) Removing Zelle from the MVP **narrows but does not close** this report's legal exposure. What
> remains: **USDT / OFAC sanctions screening** (U8), **app-store billing** for the seller subscription
> (U6), and the **privacy and retention** obligations for billing records, report evidence, and any
> stored location (U7). The Zelle-specific review scope is moot; these three are not.

## 6. Product and technical impact

- **Product.** The publishing gate becomes the seller's contract: the offer form must surface entitlement and expiry clearly (T17 already requires displaying subscription status and expiry, `backlog2.md:232`), and must fail with an actionable message rather than a generic error. Subscription priority, if any, must be labelled as paid promotion and never presented as neutral ranking (`docs/flows/search-and-contact.md:55`). Subscription status must never read as a trust or safety guarantee (`AGENTS.md:15`).
- **Data.** New Prisma models (subscription, plan reference, provider event ledger) and a migration through Prisma Migrate as the only runner (`AGENTS.md:37`); any `CHECK` constraint on the state enum or "one live subscription per seller per billing scope" partial unique index is hand-written SQL inside a `--create-only` migration, with the partial index declared through the `partialIndexes` preview feature rather than hand-edited SQL (`AGENTS.md:39–40`).
- **Money.** Amounts stored as `numeric`/integer minor units with explicit scale and currency; no binary floating point (`AGENTS.md:45`). No platform-commission value exists anywhere.
- **Security and privacy.** The webhook endpoint needs the raw body, signature verification, rate and payload limits, and no PII in logs or error bodies (`AGENTS.md:71–75`). Provider subscription ids and raw event payloads must not be exposed through the API, and the seller's billing records are personal data subject to the retention rules (`AGENTS.md:52`).
- **Operations.** The webhook path and the expiry path need monitoring and an alert on failure; the entitlement function's fail-closed behaviour means a monitoring gap degrades to "cannot publish", which is the safe direction but must be visible to support.
- **Launch blockers (outside the repository).** Production email/SMS providers and the WebAuthn RP domain/associations (`README.md:54`); the provider contract and its secrets (`AGENTS.md:51`); a reviewed terms-of-service/privacy/subscription-cancellation disclosure; a tested backup and restore (`AGENTS.md:52`); the legal review (U7, U8). Repository-side blockers: there is **no CI** (`docs/testing/e2e.md:98–108`), GitHub write access is denied for the pushing account (`docs/audit/t00-baseline.md:447`), and 49 dependency advisories remain open with only breaking fixes (`docs/audit/t00-baseline.md:454`).

## 7. Testable scenarios

Proposed for future e2e coverage in `apps/api/test/subscriptions.e2e-spec.ts` (pattern: `docs/testing/e2e.md:58`).

1. **WHEN** the provider delivers the same signed event twice **THEN** the subscription period is extended once, the second delivery returns `2xx`, and no second state change is recorded.
2. **WHEN** an event with an older period arrives after a newer one **THEN** the newer state is not rolled back.
3. **WHEN** a webhook body fails signature verification **THEN** the response is `400` and no subscription row changes.
4. **WHEN** the period end has passed and no renewal event arrived **THEN** publishing a new offer is denied with a defined error, while previously confirmed exchange records remain readable and unchanged.
5. **WHEN** a renewal event extends the period **THEN** publishing is permitted again without any client-side action.
6. **WHEN** a seller cancels with `cancel_at_period_end` **THEN** publishing is permitted until the period end and denied afterwards.
7. **WHEN** a subscription is `past_due` **THEN** the approved policy (U4) is enforced exactly, and the test names that policy.
8. **WHEN** two checkout requests carry the same idempotency key **THEN** exactly one subscription and one provider session are created.
9. **WHEN** a seller attempts to change their own subscription state through the API **THEN** the request is rejected and the stored state is unchanged.
10. **WHEN** an exchange reaches mutual completion **THEN** no platform commission record, fee, or deduction is created, and the seller's offer margin is stored and displayed but never applied by the platform.
11. **WHEN** the API runs with production configuration and the billing adapter is the test adapter **THEN** startup fails, mirroring the existing `EMAIL_DELIVERY_MODE` guard.
12. **WHEN** a scenario needs an entitled seller **THEN** the fixture provides one through the test adapter without any claim that a real payment occurred.

## 8. Sources reviewed

- `AGENTS.md` (lines 1–116), `/tmp/backlog2.md` (lines 1–268, especially 12, 19, 34–35, 76–80, 106–124, 168–180, 232, 253–259).
- `README.md`; `docs/architecture.md`; `docs/flows/seller-offer-lifecycle.md`; `docs/flows/search-and-contact.md`; `docs/flows/authentication.md` (listed, not read in full); `docs/testing/e2e.md`; `docs/audit/t00-baseline.md`; `docs/spikes/README.md`.
- `openspec/config.yaml`; `openspec/specs/testing/e2e-foundation/spec.md`; `openspec/specs/mobile/{app-shell,design-system}/spec.md` (listed).
- `apps/api/src/config/env.validation.ts`; `apps/api/src/auth/application/auth.ports.ts`; `apps/api/test/` and `apps/mobile/e2e/` inventories; `apps/mobile/AGENTS.md`.
- URLs cited inline in §2.2 (Zelle terms; Venezuelan derogation and prior exchange-control law; BCV; OFAC 31 CFR 591 and the Federal Register rule; Apple App Review Guidelines; Google Play Payments policy and subscription states; Stripe webhooks, webhook-endpoint management, and idempotent requests; Stripe global availability; two secondary Venezuelan-payments sources marked unverified).
