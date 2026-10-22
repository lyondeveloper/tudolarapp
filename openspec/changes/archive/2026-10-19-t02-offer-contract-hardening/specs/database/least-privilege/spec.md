# Spec Delta

## Purpose

Separates API runtime database permissions from migration and test-maintenance privileges so the
application cannot bypass database invariants with administrative operations.

## ADDED Requirements

### Requirement: API runtime database role cannot administer the schema
The API runtime role MUST be non-superuser, MUST NOT own the application schema, and MUST NOT have database DDL or `TRUNCATE` privileges. It MAY perform only the data operations required by application behavior.

#### Scenario: Runtime connection uses the restricted role
- **WHEN** the API connects using `DATABASE_URL`
- **THEN** its PostgreSQL role is not a superuser, cannot create objects in `public`, and lacks `TRUNCATE` privilege on `offer_terms_versions`

#### Scenario: Runtime role cannot truncate immutable terms
- **WHEN** the API runtime role attempts to truncate `offer_terms_versions`
- **THEN** PostgreSQL denies the operation and the existing terms rows remain

### Requirement: Privileged database credentials are separated from API runtime
Prisma migrations and E2E database provisioning/reset MUST use `MIGRATION_DATABASE_URL`; the API runtime MUST use the restricted `DATABASE_URL` and MUST NOT receive the privileged URL.

#### Scenario: E2E setup uses maintenance privileges but the API does not
- **WHEN** the E2E harness provisions or resets its isolated database and starts the API
- **THEN** provisioning/reset and migrations use the maintenance role while the API starts with only the runtime role
