# 0019 — Prisma owns the schema and migrations

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0019** in the stack table
  (`openspec/changes/t02-technical-contracts/design.md:32-44`)

## Context

`AGENTS.md` (section "PostgreSQL and PostGIS") already states the decision as a rule: Prisma ORM is the
single owner of the schema and of migrations under `apps/api/prisma/`, and a second migration runner
must never be run against the same schema. This record records that decision and its rationale and
cites `AGENTS.md` rather than restating it as a new rule
(`openspec/changes/t02-technical-contracts/design.md:34`).

The claim was not true in practice. `CREATE EXTENSION postgis` lives outside
`apps/api/prisma/migrations` — in `docker/initdb/01-create-databases.sql` and the E2E provisioning
script — and the `schema.prisma` header wrongly says it is appended to the migration
(`openspec/changes/t02-technical-contracts/design.md:46-51`;
`openspec/changes/t02-technical-contracts/proposal.md:21-26`). Two consequences follow: a database
created without the init script silently has no PostGIS, and the next `migrate dev` cannot add it.
That divergence is a defect in the single authority, not a reason for a second one.

## Decision

Prisma ORM and Prisma Migrate are the **sole schema and migration authority**
(`openspec/changes/t02-technical-contracts/design.md:38`). The decision, already a rule in `AGENTS.md`
(section "PostgreSQL and PostGIS"), is recorded here rather than restated:

- **One authority**, under `apps/api/prisma/`. No second migration runner; `node-pg-migrate` was
  removed and must not be reintroduced.
- Objects Prisma cannot model — `CHECK` constraints, `CREATE EXTENSION postgis`, the version-row
  immutability guard — belong to that **same** authority, carried inside `--create-only` migrations
  and verified against the catalogue (`pg_constraint`, `pg_extension`, `pg_trigger`).
- **The PostGIS divergence is resolved by ADR-0023 and the migration task in this change**
  (`openspec/changes/t02-technical-contracts/design.md:46-59`), **not** by a second authority:
  `CREATE EXTENSION postgis` becomes part of the single migration authority through a `--create-only`
  migration plus a startup assertion (ADR-0023).
- **`offer_terms_versions` is modelled in `schema.prisma`.** The existing
  `20261017200000_offer_terms_versions_immutability` migration remains the authority for the table
  DDL and its hand-written immutability triggers. Do not rewrite or duplicate this already-recorded
  migration. `offerId` remains a UUID scalar until T03 adds the `Offer` model, Prisma relation, and
  foreign key through a new migration. This resolves the model/schema drift identified in
  `docs/audits/system-design.md:50-68` without introducing a second migration authority.

## Consequences

- Schema changes go through Prisma Migrate; the single authority is now true including the extension.
- Prisma's data model and the recorded migration both describe `offer_terms_versions`; only its
  database immutability triggers remain hand-written because Prisma cannot represent them.
- T03 adds the relation to `Offer` and its foreign key without re-creating the existing table.
- `docker/initdb` and the E2E provisioning script stay as local conveniences; the migration is the
  authority (`openspec/changes/t02-technical-contracts/design.md:58-59`).
- Prisma stays pinned to a supported stable major (`^7`) per `AGENTS.md` (section "PostgreSQL and
  PostGIS"); `prisma@latest` is not installed.
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **A second migration runner for the objects Prisma cannot express.** Rejected: it would make the
  "single owner" claim false and is exactly the arrangement `AGENTS.md` (section "PostgreSQL and
  PostGIS") forbids.
- **Leaving `CREATE EXTENSION postgis` only in `docker/initdb` and the provisioning script.**
  Rejected: a database created without the init script has no PostGIS and `migrate deploy` cannot add
  it (`openspec/changes/t02-technical-contracts/design.md:46-51`); ADR-0023 moves it into the single
  authority instead.
- **Editing production schemas manually.** Rejected by `AGENTS.md` (section "PostgreSQL and PostGIS"):
  schemas change only through explicit, reviewable migrations.
