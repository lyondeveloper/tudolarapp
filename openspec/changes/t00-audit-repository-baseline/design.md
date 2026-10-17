# Design

## Context

See proposal.md — Why. Two constraints shaped how the baseline was established:

- The working tree held a large uncommitted body of work: the Prisma persistence port, the
  `apps/mobile/` Expo client, `docker/`, and documentation updates. Until that was committed, "the
  state of the repository" had no single revision to point at. It is now committed as `26c39ea`
  (Prisma port), `e60946a` (mobile scaffold), `f918287` (local environment), and `2bb5b62`
  (documentation), with this proposal in `6c9b582`. The working tree is clean and pushed.
- The tree holds two applications with different toolchains. The audit must not assume one package
  manager or one command set for both.

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

**Commit the pending work as the baseline, in concern-sized groups.** Carried out before apply: a
single squashed commit of roughly 1700 lines across a new mobile app and a persistence rewrite
would have been unreviewable and would have mixed unrelated concerns. The work went in as five
commits grouped by concern (Prisma port, mobile scaffold, local environment, documentation, this
proposal), so each can be reverted independently and a later `git bisect` stays meaningful. The
author metadata was normalised to the repository's `lyondeveloper` identity before pushing.
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
- [Committing another agent's work froze a state nobody has verified] → The commits are grouped by
  concern, so any group can be reverted independently, and section 3 of the task list verifies the
  behaviour rather than trusting the commits. The report records the exact SHAs.
- [Passkey/WebAuthn coverage may not be exercisable locally] → If the positive ceremony cannot run
  here, record the blocker and classify the test as unverified rather than claiming coverage.
- [The audit could quietly become an implementation task] → Every task in `tasks.md` is read-only
  apart from writing the report and creating the baseline commits.

## Open Questions

None that change the task breakdown. T01 and T02 resolve the product and contract decisions this
audit deliberately leaves open.
