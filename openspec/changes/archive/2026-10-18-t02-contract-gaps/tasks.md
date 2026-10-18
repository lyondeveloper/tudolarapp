# Tasks

The repository-wide E2E foundation gate in `AGENTS.md` and `docs/testing/e2e.md` is a prerequisite
to applying any implementation task. Keep the change unapplied if either required E2E suite fails.
This change does not implement the reservation or search behavior.

## 1. Correct the durable contracts

- [x] 1.1 Amend ADR-0003 and ADR-0005 so the closed `PairId` is the external search-criteria shape; update `docs/flows/search-and-contact.md` to use a valid pair id and amount asset, then verify no external criteria example still uses `direction: { give, receive }`.
- [x] 1.2 Amend ADR-0008 with the rate unit/direction, same-pair comparison rule, same-asset null-rate rule, and the fact that margin remains seller-declared and is not used to compute rate; update its entry in `docs/adr/README.md` and verify the index matches.
- [x] 1.3 Add ADR-0026 for the offers-owned inventory aggregate and reservation port, including atomic reserve/release/completion, same-transaction agreement transitions, derived availability, and the counter constraints; add it to `docs/adr/README.md` and verify the ADR has the repository's required sections.
- [x] 1.4 Amend ADR-0019 to document that `OfferTermsVersion` is modelled in Prisma while the existing migration remains the DDL/trigger authority and T03 adds the `Offer` relation; update its index entry and verify both records agree.

## 2. Align API contracts and persistence model

- [x] 2.1 Add an E2E integration assertion in `apps/api/test/e2e/offer-terms-version-immutability.e2e-spec.ts` that reads the existing table through the generated `offerTermsVersion` Prisma delegate; run `npm run test:e2e -- --runInBand test/e2e/offer-terms-version-immutability.e2e-spec.ts` from `apps/api` and confirm it fails because the delegate is absent, not because of test setup.
- [x] 2.2 Add the mapped `OfferTermsVersion` model and unique index to `apps/api/prisma/schema.prisma` without editing the existing migration; generate Prisma Client, rerun the focused E2E command from 2.1, and run `DATABASE_URL="$(node -e 'process.stdout.write(require("./test/e2e-environment.cjs").resolveTestDatabase().url)')" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` from `apps/api`, confirming the Prisma read passes, the schema diff is empty, and the existing immutability assertion remains unchanged.
- [x] 2.3 Change `SearchCriteria` to carry the shared `PairId` rather than a pair of `Leg`s, and expand the offers-domain `Offer` and offers-application reservation port to the fields and operations in the ADRs; verify layer direction and run `npx tsc --noEmit` plus `npm run build` from `apps/api`.

## 3. Verify and finish

- [x] 3.1 Run `npm test -- --runInBand` and `npm run test:e2e -- --runInBand` from `apps/api`, then `npm run build` and `npm run lint` from `apps/api`; confirm the focused schema E2E and the existing E2E scenarios pass.
- [x] 3.2 Run `openspec validate t02-contract-gaps --strict` and review the final diff against this design and ADRs 0001–0026; confirm only contract/schema-model work changed and no reservation behavior, offers table, dependency, or unrelated audit fix was added.

## Workflow follow-up

- Archive this change after all tracked tasks are complete; `skip_specs: true` means it has no delta specs to sync.
- Open a branch and pull request only after application and archive, carrying the plan, implementation, and archived change together.
