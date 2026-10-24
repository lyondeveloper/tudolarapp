# T03 Audit — Integrate Prisma Without Breaking Existing Persistence

**Change:** `t03-integrate-prisma-persistence`
**Date:** 2026-10-24
**Source:** Notion T03 — `https://app.notion.com/p/d358155c3492473581e0c058e08e3b36`

## 1. Acceptance criteria verification

| Criterion | Evidence in repository | Verification command & result |
| --- | --- | --- |
| **Prisma client generated & schema mapped** (`users`, `passkey_credentials`, `auth_sessions`, `auth_challenges`, `email_action_tokens`, `phone_verification_challenges`, `offer_terms_versions`) | `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/src/database/prisma.service.ts` | `npm --prefix apps/api run prisma:generate` → generates Prisma Client `7.10.0` to `apps/api/src/generated/prisma`. |
| **Prisma Migrate as the sole migration authority** (`node-pg-migrate` removed) | `apps/api/package.json`, `apps/api/prisma/migrations/`, `docs/adr/0019-prisma-owns-the-schema-and-migrations.md` | `grep -rn "node-pg-migrate" apps/api/package.json apps/api/package-lock.json apps/api/test apps/api/src docker` → zero matches in manifests, source, test, or docker scripts (only historical comment in `schema.prisma`). |
| **Migrations reproducible from an empty database and against existing rows; hand-written constraints intact** | `apps/api/test/e2e/migration-reproducibility.cjs`, `apps/api/test/e2e/offer-terms-version-preflight.cjs` | `npm --prefix apps/api run test:e2e:migrations` and `npm --prefix apps/api run test:e2e:preflight` → both pass; 16 hand-written `CHECK` constraints and the `postgis` extension verified in `pg_constraint` / `pg_extension`; zero drift against `prisma/schema.prisma`. |
| **No unapproved destructive changes** | `apps/api/test/migration-safety/scan-migration-sql.cjs`, `apps/api/test/migration-safety/destructive-allowlist.json`, `apps/api/test/migration-safety/scan-migration-sql.spec.ts` | `npm --prefix apps/api test -- --runInBand --runTestsByPath test/migration-safety/scan-migration-sql.spec.ts` → 10/10 tests pass; current 4 migrations produce 0 destructive findings. |
| **Data access behind hexagonal ports/repositories; atomic compare-and-swap guards preserved** | `apps/api/src/auth/application/auth.ports.ts`, `apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.ts`, `apps/api/src/auth/adapters/out/persistence/prisma-identity.repository.spec.ts` | `npm --prefix apps/api test -- --runInBand --runTestsByPath src/auth/adapters/out/persistence/prisma-identity.repository.spec.ts` → 7/7 tests pass. Real database concurrency covered by `apps/api/test/e2e/auth.e2e-spec.ts` and `apps/api/test/e2e/phone-verification-concurrency.e2e-spec.ts`. |
| **Complex PostGIS queries behind a secure, parameterized layer** | `apps/api/src/database/spatial/proximity-filter.ts`, `apps/api/src/database/spatial/proximity-filter.spec.ts`, `apps/api/test/e2e/spatial-proximity.e2e-spec.ts`, `docs/adr/0023-postgis-through-prisma.md` | `npm --prefix apps/api test -- --runInBand --runTestsByPath src/database/spatial/proximity-filter.spec.ts` (15/15) and `npm --prefix apps/api run test:e2e -- --runInBand test/e2e/spatial-proximity.e2e-spec.ts` (1/1). |

## 2. Migration inventory

1. `20261015150121_init_identity_schema` — creates `users`, `passkey_credentials`, `auth_sessions`, `auth_challenges`, `email_action_tokens`, `phone_verification_challenges`, partial unique indexes, foreign keys, and 6 hand-written `CHECK` constraints.
2. `20261017190000_add_postgis_extension` — installs `postgis` extension (`CREATE EXTENSION IF NOT EXISTS postgis`).
3. `20261017200000_offer_terms_versions_immutability` — creates `offer_terms_versions` and immutability triggers rejecting `UPDATE` and `DELETE`.
4. `20261018210152_offer_terms_version_checks` — preflights existing rows and installs 9 `CHECK` constraints on `offer_terms_versions`.

## 3. Suite and verification counts

- **API unit tests (`npm --prefix apps/api test -- --runInBand`):** 21 suites passed, 136 tests passed.
- **API E2E suite (`npm --prefix apps/api run test:e2e -- --runInBand`):** preflight + migration reproducibility passed; 8 suites passed, 31 tests passed.
- **Mobile E2E gate (`npm --prefix apps/mobile run e2e`):** 3/3 Maestro flows passed (`01-sign-in-is-first.yaml`, `02-rejected-credentials.yaml`, `03-accepted-credentials.yaml`).
- **Build, lint, and type-check (`npm run build`, `npm run lint`, `npx tsc --noEmit` in `apps/api`):** all passed with zero errors.
- **Prisma schema drift (`npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`):** `No difference detected.`
