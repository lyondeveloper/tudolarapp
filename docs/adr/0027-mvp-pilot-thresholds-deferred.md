# 0027 — Pilot thresholds and analytics are deferred

- **Status:** Accepted
- **Date:** 2026-10-24
- **Resolves:** the group I register rows — pilot thresholds, supply minimums, the deferral list, and
  whether an analytics SDK is ever added (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md`)

## Context

Group I belongs to the pilot rather than to the MVP build. The product owner chose on 2026-10-24 to
record it as explicitly open and to close T01 without inventing values, the same treatment group G
received in ADR-0013 and ADR-0014.

## Decision

Group I is **deferred, not decided**. No pilot threshold, supply minimum, deferral list, or analytics
SDK is set by this record, and no agent may infer one. They are answered by the product owner in a
later change before the pilot, when the Ciudad Ojeda launch (T20) is prepared.

## Consequences

- No analytics SDK is added to the mobile client or the API; adding one needs a new decision.
- No code, schema, or metric depends on a pilot threshold or supply minimum in the MVP build.
- Group **G** (the legal review) stays open and is unchanged by this record.
- T20 (the quality gate and limited launch) must obtain the group I answers before it begins.

## Alternatives considered

- **Choosing thresholds and an analytics SDK now.** Rejected: the backlog forbids an agent inventing
  these values, and the owner did not supply them.
- **Leaving T01 open until group I is answered.** Rejected: group I does not block the MVP build, so
  holding T01 would block T03 and everything downstream without cause.
