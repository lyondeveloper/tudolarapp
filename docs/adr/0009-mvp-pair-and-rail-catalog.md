# 0009 — The MVP pair and rail catalog

- **Status:** Accepted
- **Date:** 2026-10-17
- **Resolves:** the group A register rows left open by ADR-0005 — the pair/rail enum members, the rail of the unqualified "VES" leg, and whether a fully-digital pair needs a meeting (`docs/spikes/SYNTHESIS.md:87-88`, SP01 U6/U7)

## Context

ADR-0005 settled the pair/rail **shape** — two axes internally (`{asset, rail, delivery}`), one closed
pair id externally — and left the **members** to the product owner
(`docs/adr/0005-pair-and-rail-representation.md:36-38`;
`openspec/changes/archive/2026-10-18-spike-interface-reconciliation/design.md:70`). SP01's own unresolved items U6 and U7
asked for the rail of the unqualified "VES" leg and the canonical labels
(`docs/spikes/SP01-exchange-pairs.md:122-123`), and `docs/spikes/SYNTHESIS.md:87-88` carries them as
open. Zelle's removal already dropped the catalog from ten pairs to five
(`docs/spikes/SYNTHESIS.md:143`; `AGENTS.md:7`).

The product owner answered on 2026-10-17, with the instruction that the MVP be built step by step from
the register (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:30-32`).

## Decision

The MVP catalog is five canonical pairs on three assets and four rails, and every MVP pair is in
person (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:45-52`).

- **Five canonical pair ids:** `VES_USDT`, `VES_BANK_TO_VES_CASH`, `VES_USD_CASH`, `USDT_VES`,
  `USDT_USD_CASH`.
- **Assets:** `VES`, `USD`, `USDT`.
- **Rails:** `VES_CASH`, `VES_BANK_TRANSFER`, `USD_CASH`, `USDT_TRANSFER`.
- **The unqualified "VES" leg is physical cash**, because the product is in-person and the catalog
  itself contrasts "VES" with "VES in a bank account".
- **A meeting is required whenever either leg is physical.** A pair with two digital legs would not
  need one — but with Zelle gone, no MVP pair has two digital legs, so every MVP pair is in person.

## Consequences

- The five pair ids are the closed external allowlist; the two-axis model of ADR-0005 is unchanged, so
  the API and search criteria keep exposing the derived pair id
  (`docs/adr/0005-pair-and-rail-representation.md:32-35`).
- The members are now fixed, so `AGENTS.md:7`'s rule holds: no pair may be added without a new
  decision.
- Because every MVP pair has at least one physical leg, the meeting requirement applies to the whole
  catalog; the "two digital legs need no meeting" branch is documented but unused in the MVP.
- Left open (unchanged): group **G** (the legal review) and group **I** (pilot thresholds, supply
  minimums, the deferral list, and whether an analytics SDK is ever added) remain open
  (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:99-115`).

## Alternatives considered

- **Reading the unqualified "VES" leg as a bank transfer.** Rejected: the product is in-person and the
  catalog itself contrasts "VES" with "VES in a bank account", so the unqualified leg is the physical
  one (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:49-50`).
- **Keeping a flat single method enum.** Already rejected by ADR-0005: it cannot distinguish
  VES-by-bank from VES-in-cash, which are different pairs
  (`docs/adr/0005-pair-and-rail-representation.md:53-56`).
- **A pair with two digital legs so no meeting is needed.** Not available in the MVP: with Zelle out,
  no MVP pair has two digital legs (`openspec/changes/archive/2026-10-24-t01-product-decisions/design.md:51-52`).
