## ADDED Requirements

### Requirement: Prisma Migrate is the single migration authority
The repository SHALL contain exactly one migration runner, Prisma Migrate, whose history under `apps/api/prisma/migrations/` is the only way the schema is created or changed. No second migration runner, schema-synchronization setting, or hand-applied schema change SHALL be configured for any environment.

#### Scenario: No second migration runner is present
- **WHEN** the API package manifests, scripts, and configuration are inspected
- **THEN** no migration runner other than Prisma Migrate is declared, installed, or invoked, and no schema auto-synchronization is enabled

### Requirement: Migrations are reproducible from an empty database
Applying every migration in order to an empty PostgreSQL database with `prisma migrate deploy` SHALL succeed and SHALL produce a schema equal to `schema.prisma` plus the documented hand-written constraints and extensions.

#### Scenario: Empty database converges on the schema
- **WHEN** `prisma migrate deploy` runs against a newly created empty database
- **THEN** every migration applies without error and `prisma migrate diff` from that database to `schema.prisma` reports no difference apart from the documented hand-written `CHECK` constraints and extension

### Requirement: Migrations apply to an existing database without data loss
Applying the pending migrations to a database that is already at the previous migration state and contains rows SHALL succeed, SHALL preserve those rows, and SHALL fail without partial application when an existing row violates a new constraint.

#### Scenario: Existing rows survive the pending migrations
- **WHEN** a database at the first migration holds users, sessions, and challenges and the remaining migrations are applied
- **THEN** the migrations succeed and every pre-existing row is still present with the same values

#### Scenario: A violating row stops a constraint migration
- **WHEN** a pre-existing row would violate a constraint a migration adds
- **THEN** the migration fails naming the offending row, the row is unchanged, and the constraint is not applied

### Requirement: Unapproved destructive migration statements are rejected
A migration containing `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or a type change that can lose data SHALL be rejected by an automated check unless that migration is listed in a reviewed allowlist that records a reason.

#### Scenario: A destructive statement without an allowlist entry fails the check
- **WHEN** the destructive-statement check scans a migration containing `DROP COLUMN` that is not allowlisted
- **THEN** the check fails and names the migration, the statement, and the line

#### Scenario: The current migration history passes the check
- **WHEN** the check scans the existing migrations
- **THEN** it passes, because none contains an unapproved destructive statement

### Requirement: Hand-written constraints are verified against the catalog
`CHECK` constraints and extensions that Prisma cannot model SHALL be asserted against `pg_constraint` and `pg_extension` after migration, so a later migration that drops one is detected.

#### Scenario: A dropped hand-written constraint is detected
- **WHEN** a documented `CHECK` constraint is absent after migrations are applied
- **THEN** the catalog assertion fails and names the missing constraint
