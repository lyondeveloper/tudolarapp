# 0002 — Search location is optional

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** SP06's "location is required when GPS is unavailable" —
  `docs/spikes/SP06-prompt-to-search-contract.md:119`, recorded as conflict C1 in
  `docs/spikes/CROSS-B-discovery.md:80-90`.

## Context

SP06 makes a location mandatory when GPS is unavailable:

> "Required = direction. When GPS is unavailable, a location or an explicit in-market hint is
> required (see SP05, `/tmp/backlog2.md:62`)."
> — `docs/spikes/SP06-prompt-to-search-contract.md:119`

The other reports and the backlog say the opposite:

- `docs/spikes/SP05-market-geofences-location-privacy.md:181-183` — "Without a fix or without
  permission, the search returns the whole node."
- `docs/spikes/SP12-llm-natural-language-search.md:95` (fixture) and `SP12:149` (test) — "Search
  the whole active node."
- The backlog — "without GPS/permission, search the entire active node" (`/tmp/backlog2.md:62`,
  quoted in `docs/spikes/CROSS-B-discovery.md:80-90`).

SP06 also contradicts **its own** test #7, which says the search "runs over the whole active node
(or asks for an in-node hint)" — optional, not required
(`docs/spikes/SP06-prompt-to-search-contract.md:192`). `docs/spikes/CROSS-B-discovery.md:80-90`
records this as conflict C1, a direct contradiction: the report contradicts itself, not just its
siblings.

## Decision

Location is optional. When GPS is unavailable, denied, or outside the node, the search runs against
the whole active market (`openspec/changes/spike-interface-reconciliation/design.md:43-47`).

This is a **correction to SP06, not a new decision** — the design says so explicitly
(`openspec/changes/spike-interface-reconciliation/design.md:47`).

## Consequences

- SP06's report is corrected additively, with a pointer to this ADR; its original text stays visible
  (`openspec/changes/spike-interface-reconciliation/design.md:89-90`).
- The whole-node rule is now the fixed behavior for the discovery path; a location is never
  required.
- Left open (product owner): the GPS-accuracy threshold that degrades a fix to whole-node search
  (gap G7, `docs/spikes/CROSS-B-discovery.md:209-211`), and the UX/copy when GPS is outside the node
  (`docs/spikes/CROSS-B-discovery.md:240-241`).

## Alternatives considered

**SP06's rule — location or an explicit in-market hint is required when GPS is unavailable.**
Rejected because it contradicts SP05, SP12, and the backlog, and because SP06's own test case already
asserts the whole-node behavior: the report contradicts itself, not just its siblings
(`docs/spikes/CROSS-B-discovery.md:80-90`).
