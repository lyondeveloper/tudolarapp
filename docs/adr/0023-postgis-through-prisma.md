# 0023 — PostGIS through Prisma

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0023** in the stack table, and the PostGIS
  half of the migration-authority divergence
  (`openspec/changes/t02-technical-contracts/design.md:32-59`)

## Context

`AGENTS.md` (section "PostgreSQL and PostGIS") already states the spatial rules as requirements: Prisma
has no native geometry type, so spatial columns and `ST_DWITHIN` queries stay in migrations and
`$queryRaw`; proximity searches use consistent SRIDs, `ST_DWithin`, and appropriate GiST spatial
indexes; SQL values are parameterized and identifiers/options use explicit allowlists. This record
records that decision and its rationale and cites `AGENTS.md` rather than restating it as a new rule
(`openspec/changes/t02-technical-contracts/design.md:34`).

`CREATE EXTENSION postgis` is unmodelled by Prisma and lives outside `apps/api/prisma/migrations`, so
the single migration authority is not true for the extension today
(`openspec/changes/t02-technical-contracts/design.md:46-59`). That is resolved here, by the same
authority, not by a second one.

## Decision

PostGIS is used through Prisma, with the following recorded from
`openspec/changes/t02-technical-contracts/design.md:42,127-133` and `AGENTS.md` (section "PostgreSQL
and PostGIS"):

- **`Unsupported("geometry")` mapping.** Prisma has no native geometry type; spatial columns are
  declared with the `Unsupported("geometry")` mapping, decided when the first spatial table is
  introduced.
- **Raw SQL is confined to `adapters/out/`, behind a port.** `$queryRaw`/`$executeRaw` never reaches
  `domain/` or `application/`.
- **Consistent SRIDs.** Proximity uses `ST_DWithin` with a consistent SRID, and GiST spatial indexes
  support it.
- **The market predicate is co-located with the proximity predicate** in the same `WHERE`, so no query
  can return an out-of-market offer (`openspec/changes/t02-technical-contracts/design.md:127-133`).
- **Parameterized values only**, never interpolated, with an explicit allowlist for identifiers and
  sort options that cannot be parameterized.
- **`CREATE EXTENSION postgis` becomes part of the single migration authority** through a
  `--create-only` migration run under a privileged migration role, plus a **startup assertion** that
  fails loudly when the extension is absent
  (`openspec/changes/t02-technical-contracts/design.md:53-59`).

## Consequences

- The extension is created by the migration authority (ADR-0019) and verified against `pg_extension`;
  the app role only ever *verifies* it, never creates it, preserving least privilege
  (`openspec/changes/t02-technical-contracts/design.md:144-146`).
- `docker/initdb` stays as a local convenience and may still create the extension for a fresh local
  database, where `CREATE EXTENSION IF NOT EXISTS` then makes the migration a harmless no-op. The E2E
  provisioning script does **not** create it, so a worktree database genuinely depends on the
  migration. The migration is the authority
  (`openspec/changes/t02-technical-contracts/design.md:58-59`).
- Because a **recorded migration never re-runs**, `CREATE EXTENSION IF NOT EXISTS` inside one is not
  self-healing: if the extension is ever dropped, or a database is restored without it, `prisma
  migrate deploy` reports "no pending migrations" and changes nothing. The startup assertion detects
  it and the remedy is a privileged `CREATE EXTENSION postgis;`. The assertion's message says exactly
  that, rather than pointing at `migrate deploy`, which would not help.
- A missing extension surfaces as a clear startup error rather than a confusing query failure later
  (`openspec/changes/t02-technical-contracts/design.md:56-57`).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **A second migration runner for the extension.** Rejected: it contradicts ADR-0019's single
  authority; the extension is added by a `--create-only` migration instead.
- **Leaving `CREATE EXTENSION postgis` only in `docker/initdb`.** Rejected: a database created without
  the init script has no PostGIS and `migrate deploy` cannot add it
  (`openspec/changes/t02-technical-contracts/design.md:46-51`).
- **String-interpolated SQL for spatial predicates.** Rejected: values are parameterized and
  identifiers use an explicit allowlist (`AGENTS.md`, section "PostgreSQL and PostGIS").
- **Running the proximity predicate without the market predicate.** Rejected: they sit in the same
  `WHERE` so no query can return an out-of-market offer
  (`openspec/changes/t02-technical-contracts/design.md:127-133`).
