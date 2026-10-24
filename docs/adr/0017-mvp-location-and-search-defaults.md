# 0017 — MVP location and search defaults

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group J location rows — out-of-node copy, GPS accuracy, location precision and
  retention, and the default search radius (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:117-126`)

## Context

ADR-0002 made location optional — when GPS is unavailable, denied, or outside the node, the search runs
against the whole active market — and left two things open: the GPS-accuracy threshold that degrades a
fix to whole-node search, and the UX/copy when GPS is outside the node
(`docs/adr/0002-search-location-is-optional.md:46-48`; gaps G7 and the out-of-node copy,
`docs/spikes/CROSS-B-discovery.md:209-211,240-241`). SP05 requires
that GPS **narrows, never expands** and that the market polygon plus `market_id` be a mandatory
predicate in every offer query (`docs/spikes/SYNTHESIS.md:15`). `AGENTS.md:54` requires collecting
personal data only for a defined purpose, with controlled access and retention.

The product owner answered on 2026-10-17 (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:117-126`:

- **J3 — GPS accuracy threshold: accept a fix within 100 m; a worse fix is treated as no fix.**
- **J4 — Location is not persisted; the search centre is request-scoped.** Nothing stores a user's
  coordinates.
- **J5 — Default search radius 5 km, bounded by the market polygon.**
- **J2 — Out-of-node copy:** the app names the active market and offers "Search all of {market}" and
  "Change market".

## Consequences

- J3 supplies the GPS-accuracy threshold ADR-0002 left open: a fix worse than 100 m degrades to the
  whole-node search (`docs/adr/0002-search-location-is-optional.md:46-48`).
- J4 supports `AGENTS.md:54`'s data-minimisation rule: the coordinates exist only for the request, so
  there is no stored location for the group G retention review to cover beyond the request itself
  (`AGENTS.md:54`; `openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:124-125`).
- J5's 5 km default is bounded by the market polygon, consistent with SP05's "GPS narrows, never
  expands" and the mandatory market predicate (`docs/spikes/SYNTHESIS.md:15`).
- J2 supplies the out-of-node copy ADR-0002 left open
  (`docs/adr/0002-search-location-is-optional.md:47-48`).
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Persisting the last-known location for convenience.** Rejected: location is not persisted; the
  search centre is request-scoped (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:124-125`).
- **Accepting any GPS fix, however poor.** Rejected: a fix worse than 100 m is treated as no fix
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:123`).
- **A default radius not bounded by the market polygon.** Rejected: the 5 km default is bounded by the
  market polygon (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:126`).
- **Out-of-node copy that silently searches the whole market.** Rejected: the app names the active
  market and offers "Search all of {market}" and "Change market"
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:121-122`).
