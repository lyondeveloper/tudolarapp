# TUDOLAR

TUDOLAR is a mobile-first P2P marketplace that connects people who want to buy or sell cash and currencies in person. It aims to replace scattered posts in WhatsApp groups and social media with nearby, comparable offers and profiles with reputation signals.

## Problem and purpose

Zulia has recurring demand for USD cash and exchanges involving USD cash, USDT, Zelle, and Venezuelan bolivars. The MVP starts in **Ciudad Ojeda**. Cabimas and Maracaibo are potential expansion areas after activity, safety, and support have been validated in the first market.

TUDOLAR helps users discover offers and contact each other. **It does not custody cash or crypto, settle exchanges, or provide escrow.** The parties coordinate and complete the exchange in person, with recommendations for public meeting places.

## Users and proposed business model

- **Buyers/requesters:** free access.
- **Sellers/cashiers:** monthly subscriptions for publishing offers and plan-based limits/visibility.
- No per-exchange commission is planned. Proposed plan prices and benefits are hypotheses to validate, not final pricing.

## MVP scope

1. Buy/sell offers by asset pair, amount, payment method, area, and expiration.
2. Search with standard filters and local natural language. The LLM only parses text into typed criteria that the backend validates; it must never generate or execute SQL. PostgreSQL/PostGIS performs the search and ordering.
3. List/map results, offer details, public seller profiles, and in-app contact.
4. Public-meeting recommendations, reputation, blocking, and reports. Verification must not be presented as a guarantee that an exchange is safe.
5. Seller subscriptions and offer publishing/moderation controls.

### Geographic market scope

The MVP starts with the Ciudad Ojeda market; future cities such as Cabimas or Maracaibo can be separate markets. A market defines an active service area, represented geographically rather than only by a city-name string. Each offer belongs to one market, and search, conversations, and agreed exchange records retain the market context of the originating offer. User identity and authentication remain global: users can select or switch markets, but market selection is not an authorization grant. Seller eligibility and resource access are validated by the API for each operation. Whether seller profiles and subscription billing are global or market-specific remains open.

### Proposed sign-in and identity

The approved MVP design allows each account to sign in with either a **passkey** or **username/email and password**, and to add the other method later. A verified email is used for email sign-in and password recovery; a verified phone number is a contact detail, not a sign-in factor. Sessions use short-lived JWT access tokens and rotating refresh tokens. Email/SMS providers, the passkey domain, and iOS/Android app associations still need to be selected.

This describes the target scope; see the implementation status below for API coverage and remaining production/mobile gates.

## Target architecture

- **Mobile client (planned):** React Native + Expo + TypeScript.
- **API:** NestJS + TypeScript, modular monolith with hexagonal architecture (domain/use cases/ports/adapters).
- **Data:** PostgreSQL and PostGIS; versioned migrations are the source of truth.
- **Integrations:** constrained LLM parser, WebAuthn/passkey verification, and email/SMS ports; choose production providers before launch.

Editable Mermaid diagrams are maintained separately for product, design, and engineering:

- [Architecture and systems](docs/architecture.md)
- [Search, contact, and meeting](docs/flows/search-and-contact.md)
- [Seller and offer lifecycle](docs/flows/seller-offer-lifecycle.md)
- [Authentication and sessions](docs/flows/authentication.md)

## Implementation status

- The NestJS API is in `apps/api`; `GET /health` remains public.
- The authentication API now supports password registration, verified-email login, password recovery/reset, passkey registration/authentication ceremonies, JWT access tokens, rotating/revocable refresh sessions, `GET /users/me`, and phone verification.
- PostgreSQL identity/session persistence is defined through `node-pg-migrate` migrations. Automated tests cover password registration/login/recovery, session rotation/replay, private user DTOs, phone verification, and passkey challenge/error handling.
- Production email/SMS providers are not selected and are unavailable by default. The current test adapters do not deliver messages outside the test process. The production WebAuthn RP domain and iOS/Android app associations are also still unconfigured.
- No mobile client or market management/service-area persistence, offers, search, chat, subscriptions, or exchange records are implemented yet.

## Run the API

The API requires the variables listed in [`apps/api/.env.example`](apps/api/.env.example). Copy it to `apps/api/.env`, fill in the database URL, RSA key pair, issuer/audience, and OTP pepper, and keep the real `.env` file out of version control. `localhost` is a development-only WebAuthn RP ID; production needs a stable domain and app associations.

From the repository root:

```bash
cd apps/api
npm install
npm run db:migrate:up
npm run start:dev
```

The API listens on port `3000` by default (override with `PORT`). Health check: `GET /health`.

Available test commands:

```bash
npm test -- --runInBand
TUDOLAR_TEST_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/tudolar_test npm run test:e2e -- --runInBand
npm run build
npm exec -- eslint "src/**/*.ts" "test/**/*.ts"
```

The e2e command applies migrations to a disposable local PostgreSQL database. It rejects database hosts other than localhost and database names not ending in `_test`.

Read [`AGENTS.md`](AGENTS.md) before making changes. It contains project context and engineering conventions; the TDD workflow is provided by the [`tdd-red-first` skill](.devin/skills/tdd-red-first/SKILL.md).
