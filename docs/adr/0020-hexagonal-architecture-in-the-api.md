# 0020 — Hexagonal architecture in the API

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the T02 stack decision recorded as row **0020** in the stack table
  (`openspec/changes/t02-technical-contracts/design.md:32-44`)

## Context

`AGENTS.md` (section "Node.js and NestJS — hexagonal architecture") already states the decision as
rules: keep the domain independent of NestJS, HTTP, PostgreSQL/ORM, and external providers; point
dependencies inward; and organize each module by business context with the suggested layers. This
record records that decision and its rationale and cites `AGENTS.md` rather than restating it as a new
rule (`openspec/changes/t02-technical-contracts/design.md:34`).

The existing shape to follow is `apps/api/src/auth/` and `apps/api/src/users/`
(`openspec/changes/t02-technical-contracts/design.md:7`): each module already separates `domain/`,
`application/`, `adapters/in/`, and `adapters/out/`, with the NestJS wiring in `module.ts`. The
`auth/` module is the reference implementation.

## Decision

The API follows hexagonal architecture with the layer names and dependency direction recorded here and
stated as rules in `AGENTS.md` (section "Node.js and NestJS — hexagonal architecture"):

- **Layers:** `domain/`, `application/`, `adapters/in/`, `adapters/out/` (or `infrastructure/`), plus
  `module.ts` for NestJS composition and dependency-injection wiring.
- **Dependency direction:** inward. Dependencies point to `domain/` and `application/`; infrastructure
  implements contracts defined inward. Use cases depend on interfaces (ports), not on the ORM, SQL,
  persistence models, or concrete repositories.
- **The `domain/` rule:** `domain/` imports nothing infrastructural — no NestJS, HTTP, PostgreSQL/ORM,
  or external provider. Domain models, value objects, invariants, and domain services live there.
- **Reference implementation:** the existing `apps/api/src/auth/` shape (with `apps/api/src/users/`),
  which the change cites as the model to follow
  (`openspec/changes/t02-technical-contracts/design.md:7`).

## Consequences

- Ports are defined near the application/domain that needs them; concrete implementations live in
  `adapters/out/`.
- Controllers stay thin and live in `adapters/in/`; HTTP DTOs stay inside inbound adapters; domain
  models are mapped at boundaries and never exposed through the API.
- New modules (`markets`, `sellers`, `subscriptions`, `offers`, `search`, `conversations`,
  `exchanges`, `reports`) adopt the same shape, using only the layers they actually need
  (`openspec/changes/t02-technical-contracts/tasks.md:50`).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/t02-technical-contracts/design.md:157-161`).

## Alternatives considered

- **Layer-first organization (all controllers together, all repositories together).** Rejected:
  `AGENTS.md` (section "Node.js and NestJS — hexagonal architecture") organizes by business
  module/context and separates responsibilities within each module.
- **Letting `domain/` import the ORM or NestJS for convenience.** Rejected: it inverts the dependency
  direction and breaks the `domain/` rule.
- **A new layer shape for the new modules.** Rejected: the existing `auth/` shape is the reference
  implementation to follow (`openspec/changes/t02-technical-contracts/design.md:7`).
