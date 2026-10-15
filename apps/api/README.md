# TUDOLAR API

The NestJS + TypeScript backend for the TUDOLAR MVP, a P2P marketplace for arranging in-person cash/currency exchanges. The target is a modular monolith with hexagonal architecture and PostgreSQL/PostGIS persistence.

Product context is in the [root README](../../README.md). Diagrams: [architecture](../../docs/architecture.md) and [user flows](../../docs/flows/).

## Implementation status

The API exposes `GET /health` and the initial authentication slice:

- Password registration, verified-email login, email verification, password recovery/reset, and Argon2id hashing.
- Passkey/WebAuthn registration and authentication endpoints with server-generated challenges and RP ID/origin verification.
- RS256 access JWTs and opaque refresh sessions with rotation, logout, and family revocation on replay.
- Private `GET /users/me` and authenticated phone verification through an SMS port.
- PostgreSQL repositories and `node-pg-migrate` migrations for users, passkeys, sessions, challenges, and action tokens.

Automated e2e tests cover the password flows, DTO privacy, session rotation/replay, phone verification, and passkey challenge/error handling. They do not yet exercise a valid real authenticator assertion. Production email/SMS adapters are unavailable until providers are selected, and native iOS/Android passkeys require a production RP domain and app associations. Market management/service-area persistence, marketplace offers, search, chat, subscriptions, and agreed exchange records are not implemented.

## Requirements and setup

Development has been checked with Node.js 24 and npm. Start PostgreSQL and configure the required values in `.env` using [`.env.example`](.env.example). Keep real keys and credentials out of version control. Configure a local WebAuthn RP ID/origin for development; do not use localhost in production.

From this directory:

```bash
npm install
npm run db:migrate:up
npm run start:dev
```

`DATABASE_URL`, an RSA JWT key pair, issuer/audience, WebAuthn RP settings, and a phone OTP pepper are required. The API listens on port `3000` by default; override it with `PORT`. Health check: `GET /health`.

## Tests and quality checks

```bash
npm test -- --runInBand
TUDOLAR_TEST_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/tudolar_test npm run test:e2e -- --runInBand
npm run build
npm exec -- eslint "src/**/*.ts" "test/**/*.ts"
```

The e2e runner applies migrations before testing and refuses database hosts other than localhost or database names not ending in `_test`. Use a disposable test database. The test process creates ephemeral JWT keys and uses in-memory email/SMS adapters.

Follow the project [`tdd-red-first` skill](../../.devin/skills/tdd-red-first/SKILL.md) for every feature and behavior change: write and verify the focused failing test before implementing, then confirm it passes.
