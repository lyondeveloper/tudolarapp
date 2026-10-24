# Proposal

Source: Notion T03 — https://app.notion.com/p/d358155c3492473581e0c058e08e3b36 — Integrate Prisma Without Breaking Existing Persistence

## Why

Most of T03 already shipped with earlier work: Prisma 7 and Prisma Migrate are installed, four migrations exist, `schema.prisma` models users, passkey credentials, sessions, challenges, email tokens and phone challenges, `node-pg-migrate` is gone, and identity persistence sits behind `PrismaIdentityRepository`. What has not been shown is that T03's acceptance criteria hold as a whole, so the task cannot be marked Done on assertion. Three concrete gaps remain: nothing proves migrations are reproducible from an empty database *and* against the current one; the 648-line `PrismaIdentityRepository` has no test beside it, which `AGENTS.md` requires; and there is no secure, parameterized layer for the PostGIS queries that T04/T10 will need.

## What Changes

- Audit each T03 acceptance criterion against the repository and record the evidence (migration inventory, schema-to-database parity, destructive-statement scan).
- Add an automated check that `prisma migrate deploy` succeeds from an empty database and on a database already at the previous migration state, and that the resulting schema has no drift from `schema.prisma` plus the documented hand-written constraints.
- Add a guard that fails when a migration contains an unapproved destructive statement (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, data-losing `ALTER ... TYPE`) unless it is explicitly allowlisted with a reason.
- Add `prisma-identity.repository.spec.ts` beside the repository, covering the mapping boundary and the atomic compare-and-swap paths (session rotation, challenge consumption) that `AGENTS.md` calls security-critical.
- Add a small parameterized spatial query layer in `apps/api/src/database/` that validates SRID/unit assumptions and identifier allowlists, so later tasks do not hand-build SQL strings.
- Document the migration authority, the audit evidence, and the spatial layer in `docs/`.

No table, column, or migration is added or changed. No product behavior changes.

## Capabilities

### New Capabilities
- `database/migration-authority`: Prisma Migrate is the single migration authority; migrations are reproducible from empty and from the current database, free of unapproved destructive changes, and free of drift from the schema.
- `database/spatial-queries`: Spatial queries run through one parameterized layer with an identifier allowlist and explicit SRID and unit handling.

### Modified Capabilities

None. Identity behavior and the existing `database/least-privilege` and `offers/terms-and-inventory` requirements do not change.

## Impact

- API modules: `apps/api/src/database/` (spatial layer), `apps/api/src/auth/adapters/out/persistence/` (new spec only).
- Tests and tooling: migration reproducibility and destructive-statement checks under `apps/api/test/`, wired into `npm run test:e2e`.
- Docs: `docs/testing/e2e.md`, and an audit note for T03.
- Dependencies: none added.

## Out of Scope

- Any new table, column, index, or migration; the geographic market model and the Ciudad Ojeda polygon (T04), and the `Unsupported(...)` geometry mapping, which is decided when the first spatial table is introduced.
- Authentication and verification gaps (T06), market isolation and authorization (T05), and moving `offer_terms_versions` behind a concrete repository (T09).
- Production backup, restore, and secret provisioning.
