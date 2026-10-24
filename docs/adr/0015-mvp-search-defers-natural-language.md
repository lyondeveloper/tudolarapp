# 0015 — MVP search defers natural language

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group H register rows by deferral — LLM provider and model, PII handling for free
  text, the cost budget at pilot scale, the auth requirement for parsing, and logging
  (`docs/spikes/SYNTHESIS.md:125`, SP06/SP12)

## Context

SP06 and SP12 proposed a rules-first deterministic parser behind one port, over a closed allowlisted
criteria schema (`docs/spikes/SYNTHESIS.md:16,22`). ADR-0003 put that closed schema on SP06 as the
contract, with SP12 emitting its field names plus an explicit unparsed outcome
(`docs/adr/0003-search-criteria-schema-is-closed.md`). `docs/spikes/SYNTHESIS.md:125` carried the LLM
provider and model, PII handling for free text, and the cost budget at pilot scale as open, and
`docs/spikes/SYNTHESIS.md:95-96` listed natural-language search among the deferral candidates.

The product owner answered on 2026-10-17 (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

Natural-language search (H1–H5) is **deferred**. The MVP ships manual filters only
(`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:106-109`).

The parser port stays **defined but unimplemented**, so the deferral is a missing adapter rather than a
redesign.

## Consequences

- The MVP search path is manual filters over the closed criteria schema of ADR-0003; the deterministic
  backend search runs the same either way (`docs/adr/0003-search-criteria-schema-is-closed.md`).
- The parser port exists with no adapter behind it, so implementing natural-language search later is
  adding an adapter, not reshaping the contract
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:108-109`).
- The LLM provider/model, PII handling for free text, and cost budget stay open — deferred, not decided
  (`docs/spikes/SYNTHESIS.md:125`).
- `AGENTS.md:11` is unaffected: natural language may only ever parse text into typed criteria, never
  generate SQL, own monetary rules, or perform deterministic ranking.
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot) remain open
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Shipping a rules-first deterministic parser (SP12) in the MVP.** Deferred: the MVP ships manual
  filters only (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:108-109`).
- **Implementing the parser without keeping the port defined.** Rejected: the port stays defined but
  unimplemented, so the deferral is a missing adapter rather than a redesign
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:108-109`).
- **Deciding the LLM provider and cost budget now while building nothing.** Rejected: those rows are
  deferred, not decided, and stay open (`docs/spikes/SYNTHESIS.md:125`).
