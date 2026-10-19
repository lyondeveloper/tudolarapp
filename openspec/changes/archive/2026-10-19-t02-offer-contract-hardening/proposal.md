# Proposal

## Why

The T02 follow-up now freezes offer terms and inventory contracts, but two database-safety gaps
remain before the PR is ready to merge: the migration preflight has not been exercised against
invalid existing data, and the runtime API still shares an administrative database role that can
bypass row triggers with `TRUNCATE`.

## What Changes

- Enforce immutable offer-pair identity, pair/amount asset compatibility, give-asset limits,
  positive amounts/rates, margin and expiry bounds, and persistence numeric limits while preserving
  ADR-0010's seven-day publish default.
- Complete the publish input with the offer's initial inventory amount and seller-set terms, and the
  offer read contract with current terms, so T09/T10 do not infer missing data.
- Add a shared application transaction context to terms and inventory write ports, including a
  defined failure result for guarded release/completion.
- Add new database constraints and E2E coverage without rewriting the existing terms-version
  migration; verify DELETE as well as UPDATE immutability.
- Exercise the terms migration preflight with a deliberately invalid pre-existing row and verify
  that it aborts without changing that row.
- Separate the non-administrative API runtime role from the privileged migration/E2E-maintenance
  role, and keep the privileged connection out of the runtime API process.
- Fix PR-local provenance references and align the PostGIS migration rule in `AGENTS.md` with the
  migration authority already described by the PR's ADRs.

## Capabilities

### New Capabilities
- `database/least-privilege`: Separates API runtime database permissions from migration and E2E maintenance privileges.

### Modified Capabilities
- `offers/terms-and-inventory`: Safely preflights existing terms rows before installing constraints.

## Impact

- API modules: `apps/api/src/offers/`, `apps/api/src/exchanges/`, and shared transaction contracts in
  `apps/api/src/common/application/`.
- Persistence and tests: Prisma migration preflight coverage, role provisioning, E2E URL/reset
  separation, offers-domain unit specs, and API integration/E2E coverage.
- Local setup/docs: `docker/initdb/`, API runtime/migration environment examples, `.gitignore`,
  and `docs/testing/e2e.md`.
- PR documentation: ADRs, `docs/adr/README.md`, and the conflicting PostGIS statement in
  `AGENTS.md`.
- This is a follow-up to open PR #6, not a new product feature. It freezes contracts and validation;
  it does not add offer/search HTTP routes or concrete T09/T13 repositories.

## Out of Scope

- Mobile session/auth fixes, API perimeter hardening, offer-status vocabulary, production secret
  provisioning outside repository configuration, unrelated test-harness work, and the open T01
  legal/pilot decisions; these remain separate audit follow-ups.
