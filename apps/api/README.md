# TUDOLAR API

The NestJS + TypeScript backend for the TUDOLAR MVP, a P2P marketplace for arranging in-person cash/currency exchanges. The target is a modular monolith with hexagonal architecture and PostgreSQL/PostGIS persistence through Prisma ORM.

Product context is in the [root README](../../README.md). Diagrams: [architecture](../../docs/architecture.md) and [user flows](../../docs/flows/).

## Implementation status

The API exposes `GET /health` and the initial authentication slice:

- Password registration, verified-email login, email verification, password recovery/reset, and Argon2id hashing.
- Passkey/WebAuthn registration and authentication endpoints with server-generated challenges and RP ID/origin verification.
- RS256 access JWTs and opaque refresh sessions with rotation, logout, and family revocation on replay.
- Private `GET /users/me` and authenticated phone verification through an SMS port.
- Prisma repositories and Prisma migrations for users, passkeys, sessions, challenges, and action tokens.

Automated e2e tests cover the password flows, DTO privacy, session rotation/replay, phone verification, and passkey challenge/error handling. They do not yet exercise a valid real authenticator assertion. Production email/SMS adapters are unavailable until providers are selected, and native iOS/Android passkeys require a production RP domain and app associations. Market management/service-area persistence, marketplace offers, search, chat, subscriptions, and agreed exchange records are not implemented.

## Requirements and setup

Development has been checked with Node.js 24 and npm. Start PostgreSQL and configure the required values in `.env` using [`.env.example`](.env.example). Keep real keys and credentials out of version control. Configure a local WebAuthn RP ID/origin for development; do not use localhost in production.

Start the local database from the repository root (it also creates the disposable `tudolar_test` database):

```bash
docker compose up -d
```

From this directory:

```bash
npm install
npm run db:migrate:dev
npm run start:dev
```

`npm install` runs `prisma generate` through a `postinstall` hook; the generated client is git-ignored. `DATABASE_URL`, an RSA JWT key pair, issuer/audience, WebAuthn RP settings, and a phone OTP pepper are required. The API listens on port `3000` by default; override it with `PORT`. Health check: `GET /health`.

## Schema and migrations

Prisma owns the schema (`prisma/schema.prisma`) and the migrations (`prisma/migrations/`). Two classes of object cannot be expressed in the Prisma schema and live in hand-written `--create-only` migrations:

- the `CHECK` constraints (Prisma Migrate does not support them and `db pull` does not introspect them);
- the PostGIS extension, created by the `--create-only` migration `20261017190000_add_postgis_extension` under a privileged migration role. The API verifies it at startup (`src/database/postgis-extension.ts`) and never creates it.

If a future `prisma migrate dev` proposes dropping either, the schema has drifted — restore it instead of accepting the drop. Partial unique indexes are declared in the schema with the `partialIndexes` preview feature and `where: raw(...)`. See [`../../AGENTS.md`](../../AGENTS.md).

Useful commands: `npm run db:migrate:dev`, `npm run db:migrate:deploy`, `npm run db:migrate:status`, `npm run prisma:generate`, `npm run db:studio`.

## Tests and quality checks

```bash
npm test -- --runInBand
TUDOLAR_TEST_DATABASE_URL=postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar_test npm run test:e2e -- --runInBand
npm run build
npm exec -- eslint "src/**/*.ts" "test/**/*.ts"
```

The e2e runner generates the client, applies migrations, and then tests, refusing database hosts other than localhost or database names not ending in `_test`. Use a disposable test database. Jest runs with `--experimental-vm-modules` because the Prisma 7 client loads its WASM query compiler through a dynamic import. The test process creates ephemeral JWT keys and uses in-memory email/SMS adapters.

Follow the project [`tdd-red-first` skill](../../.devin/skills/tdd-red-first/SKILL.md) for every feature and behavior change: write and verify the focused failing test before implementing, then confirm it passes.
