# Proposal

## Why

The backlog's "known starting state" claims `node-pg-migrate` owns the migrations, that no mobile
client exists, and that a positive WebAuthn registration test is unverified. The repository has
since moved: Prisma owns the schema, an Expo client exists under `apps/mobile/`, and a large body of
work sits uncommitted. The project therefore has no verified, reproducible statement of what
actually works today, so every later task would build on assumptions rather than evidence.

This change establishes that statement. It is the first task of the sequential backlog (T00) and it
gates T01 through T20.

## What Changes

- Establish a committed baseline so the audit describes a fixed revision instead of a dirty working
  tree.
- Record an inventory of the real state: branch, layout, scripts, implemented modules, migrations,
  environment variables, and external services.
- Run the available unit, e2e, build, lint, format, and dependency-audit commands, recording the
  exact command and result of each.
- Classify existing failures as reproducible, flaky, or environmental, with enough detail to
  reproduce them.
- Verify whether the positive WebAuthn registration/authentication test actually executes and
  passes, and document what is genuinely covered.
- Produce the baseline test set that later tasks must keep green.

Explicitly **not** included: no new product capability, no schema change, no refactor. The backlog
forbids starting new functionality during this audit, and this change honours that.

## Capabilities

No spec-level behavior changes. This is an audit and tooling change, so `.openspec.yaml` sets
`skip_specs: true`. `openspec/specs/` stays empty until a change actually alters observable
behavior; nothing here does, so no requirement is invented to satisfy validation.

## Impact

- New: `docs/audit/t00-baseline.md` — the inventory and evidence, and the only durable output.
- Read-only inspection of `apps/api/`, `apps/mobile/`, `docker/`, `docs/`, and the root config.
- Commits the work currently in the working tree so the baseline is a reproducible revision.
- No production code, schema, or dependency change.

Source: Notion T00 — https://app.notion.com/p/d358155c3492473581e0c058e08e3b36 — Auditar el repositorio y fijar una línea base
