# Tasks

## 1. The decision records

- [ ] 1.1 Create `docs/adr/README.md` with the index, the numbering convention, and the rule that an ADR records a decision that later work may cite — then verify every ADR written below is listed in it.
- [ ] 1.2 Write `docs/adr/0001-terms-versions-belong-to-the-offer.md`: the immutable terms version is owned by the offer, an agreement references a version id, and the rejected agreement-scoped alternative is recorded with why it fails T13's requirement.
- [ ] 1.3 Write `docs/adr/0002-search-location-is-optional.md`: a missing, denied, or out-of-node location searches the whole active market; record that SP06 contradicted the backlog and its own test, so this is a correction rather than a new decision.
- [ ] 1.4 Write `docs/adr/0003-search-criteria-schema-is-closed.md`: SP06 owns the closed criteria schema, SP12's parser emits exactly it, and the schema needs an explicit unparsed/needs-clarification outcome.
- [ ] 1.5 Write `docs/adr/0004-agreement-status-enum.md`: SP04's enum is authoritative (`awaiting_confirmation`, `confirmed_by_both`, `cancelled`, `incident_open`, `completed`, `expired`), and SP11's invented labels are superseded.
- [ ] 1.6 Write `docs/adr/0005-pair-and-rail-representation.md`: two axes internally (`{asset, rail, delivery}`) with one closed pair id exposed to the API and search criteria; record why a single method enum fails on the two VES rails, and leave the enum members to the product owner.
- [ ] 1.7 Write `docs/adr/0006-publish-authorization-composition.md`: the offer-publish use case composes seller eligibility and subscription entitlement from two ports; record the three distinct concepts and the rule that "suspended" is not reused across them.
- [ ] 1.8 Write `docs/adr/0007-offer-and-quote-shape.md`: the offer stores an explicit rate, the quote stores its source and as-of time, and the seller margin is its own field — recording that this shape holds whether or not a platform reference rate exists, and that the question itself stays open for T01.

## 2. Correcting the evidence

- [ ] 2.1 Correct `docs/spikes/SP06-prompt-to-search-contract.md` where it requires a location, adding a pointer to ADR-0002 rather than deleting the original text; verify the report's own test case and the corrected prose now agree.
- [ ] 2.2 Correct `docs/spikes/SP12-llm-natural-language-search.md` to SP06's field names and add the unparsed outcome, with a pointer to ADR-0003; verify no old field name remains in the report.
- [ ] 2.3 Correct `docs/spikes/SP11-seller-transaction-history-earnings.md` to SP04's status enum, with a pointer to ADR-0004; verify every status it names is in the enum.
- [ ] 2.4 Correct `docs/spikes/SP04-agreement-cancellation-incidents.md` and `docs/spikes/SP09-technical-feasibility-test-architecture.md` so both point at ADR-0001 for the terms-version parent; verify neither still claims the other's parent.
- [ ] 2.5 Correct `docs/spikes/SP01-exchange-pairs.md`, `SP02-pricing-quotes-limits.md` and `SP07-seller-eligibility-trust-safety.md` for the pair/rail shape and the publish-gate composition, with pointers to ADR-0005 and ADR-0006; verify each report's shape now matches the ADR.
- [ ] 2.6 Correct `docs/spikes/SP08-subscription-compliance-launch.md` to name the entitlement's role in the publish gate (ADR-0006) and to record that Zelle's removal narrows but does not close its legal exposure; verify the remaining exposure is named.
- [ ] 2.7 Correct `docs/flows/search-and-contact.md`, whose worked example carries the superseded criteria field names, to ADR-0003's schema and remove the note that currently marks it superseded; verify no old field name remains and that the example still parses under the new schema.

## 3. Synthesis

- [ ] 3.1 Update `docs/spikes/SYNTHESIS.md` so the cross-check table records each finding as resolved with its ADR number, and so the open-decisions list no longer contains anything an ADR settled; verify no resolved item still appears as open.

## 4. Verification

- [ ] 4.1 Run `openspec validate spike-interface-reconciliation --strict` and confirm it passes with `specs` correctly skipped.
- [ ] 4.2 Confirm no application code, schema, migration, or dependency changed: `git diff --stat` must show only `docs/`, `AGENTS.md`, and `openspec/`.
- [ ] 4.3 Confirm the API and mobile suites are untouched: `npm test -- --runInBand` and `npm run test:e2e -- --runInBand` from `apps/api` (11 and 13 tests), and `npm test` from `apps/mobile` (29 tests).

## Workflow follow-up

- Archive this change once the product owner's review is satisfied. It declares `skip_specs: true`, so archiving contributes no spec delta.
- T02 consumes these ADRs when T01 lands; every T01-dependent contract stays out of this change on purpose.
