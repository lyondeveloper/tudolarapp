# Design

## Context

See proposal.md — Why. Two constraints shape how the baseline is established:

- The working tree holds a large uncommitted body of work: the Prisma persistence port, the
  `apps/mobile/` Expo client, `docker/`, and documentation updates. Until that is committed, "the
  state of the repository" has no single revision to point at.
- The tree now holds two applications with different toolchains. The audit must not assume one
  package manager or one command set for both.

## Goals / Non-Goals

**Goals:**
- One committed revision that the audit report describes and later changes can diff against.
- Every recorded result traceable to an exact command run from a stated working directory.
- A baseline test set broad enough to catch regressions in the auth and persistence work that
  already exists, and small enough to keep green.

**Non-Goals:**
- Fixing what the audit finds. Classification is the deliverable; repair belongs to a later change.
- Answering T01/T02 questions (market polygon, payment methods, provider selection). Where the audit
  meets an undecided product rule, it records the dependency instead of choosing.

## Decisions

**Commit the pending work as the baseline, in concern-sized groups.** A single squashed commit of
roughly 1700 lines across a new mobile app and a persistence rewrite would be unreviewable and would
mix unrelated concerns. Grouping by concern (Prisma port, mobile scaffold, docker, documentation)
keeps each commit explainable and makes a later `git bisect` meaningful.
- Alternative considered: commit everything at once. Rejected: the audit's value depends on the
  baseline being reviewable.

**`apps/mobile/` stays a standalone package.** The root has no workspace configuration, and the
mobile app carries its own lockfile and toolchain. The audit records each application's commands
separately instead of inventing a root-level script.
- Alternative considered: introduce root workspaces first. Rejected: that is a structural change, and
  this audit must not start new work.

**A local PostgreSQL with PostGIS is a prerequisite, not a finding.** The e2e runner applies
migrations to a disposable database whose name must end in `_test` and rejects non-local hosts, so
the audit starts the documented container and records the outcome rather than treating an absent
database as a defect.

**Audit findings live in `docs/audit/t00-baseline.md`, not in `openspec/specs/`.** Specs describe
observable behavior. An inventory of what currently works is evidence for a report, not a
requirement the system must satisfy, so it does not belong in the spec tree.

## Risks / Trade-offs

- [The uncommitted work may be unfinished or incorrect] → The audit reports it as the baseline
  without vouching for it. T03 owns the Prisma port's correctness and T06 owns auth coverage;
  findings are recorded, never silently fixed.
- [Committing another agent's work could freeze a half-finished state] → Commit in concern-sized
  groups so any group can be reverted independently, and record the exact commits in the report.
- [Passkey/WebAuthn coverage may not be exercisable locally] → If the positive ceremony cannot run
  here, record the blocker and classify the test as unverified rather than claiming coverage.
- [The audit could quietly become an implementation task] → Every task in `tasks.md` is read-only
  apart from writing the report and creating the baseline commits.

## Open Questions

None that change the task breakdown. T01 and T02 resolve the product and contract decisions this
audit deliberately leaves open.
