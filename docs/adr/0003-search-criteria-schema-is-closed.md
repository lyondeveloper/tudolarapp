# 0003 — Search criteria schema is closed

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** SP12's stale criteria field names —
  `docs/spikes/SP12-llm-natural-language-search.md:31` (`action`, `payment_method_offered`,
  `payment_method_wanted`, `location_hint`, `max_distance_km`) and `SP12:106`, recorded as
  mismatches I1 and I2 in `docs/spikes/CROSS-B-discovery.md:120-143`.

## Context

SP06 owns a closed, allowlisted criteria schema:

```
intent; direction{give,receive}; amount{value,asset}; location{hint_text,radius_km};
unresolved[]; confidence{direction,amount,location}
```
— `docs/spikes/SP06-prompt-to-search-contract.md:88-104`

Every key is allowlisted and every enum member comes from SP01's catalog; no other key is accepted
(`docs/spikes/SP06-prompt-to-search-contract.md:88`), and the closed-schema check rejects unknown
keys and any enum value outside the catalog (`SP06:109`).

SP12 still cites the pre-existing illustrative contract whose names SP06 replaced:
`docs/spikes/SP12-llm-natural-language-search.md:31` lists `intent`, `action`,
`payment_method_offered`, `payment_method_wanted`, `amount`, `location_hint`, `max_distance_km`, and
`SP12:106` requires `payment_method_offered`/`payment_method_wanted` to be members of the SP01
catalog. SP06 dropped `action`, renamed the pair to `direction{give,receive}`, renamed
`location_hint` → `location.hint_text`, `max_distance_km` → `location.radius_km`, and changed
`amount` from a number to `{value,asset}`. `docs/spikes/CROSS-B-discovery.md:120-136` records this
as interface mismatch I1.

Separately, SP12 needs a "cannot parse" outcome
(`docs/spikes/SP12-llm-natural-language-search.md:70`) that SP06's `intent` enum
(`search_offer | unsupported`, `SP06:92`) does not have; SP06 handles parser failure out-of-band as
"Parser failure → manual filters" (`SP06:150`). `docs/spikes/CROSS-B-discovery.md:138-143` records
this as mismatch I2.

## Decision

SP06 owns the closed criteria schema, and SP12 adopts it. SP12's parser emits SP06's field names —
`direction{give,receive}`, `location{hint_text,radius_km}`, `amount{value,asset}` — not the older
names its report still shows (`openspec/changes/spike-interface-reconciliation/design.md:49-51`).

The schema is closed: every key allowlisted, every enum member from SP01's catalog, no other key
accepted (`docs/spikes/SP06-prompt-to-search-contract.md:88`, `SP06:104`, `SP06:109`).

One addition is needed: SP06's `intent` enum has no way to express "cannot parse". The schema needs
an explicit unparsed/needs-clarification outcome, because SP12's failure budget depends on the
parser being able to say so rather than guessing
(`openspec/changes/spike-interface-reconciliation/design.md:52-54`).

## Consequences

- SP12's report is corrected additively to SP06's field names; SP12 already concedes the authority
  — "The schema is owned by SP06; the enum values by SP01"
  (`docs/spikes/SP12-llm-natural-language-search.md:73`).
- The design fixes that the unparsed/needs-clarification outcome must exist; it does not name the
  enum member, and the enum members come from SP01's catalog
  (`docs/spikes/SP06-prompt-to-search-contract.md:88`).
- The funnel event shape must adopt the two-leg `direction` with an asset per leg instead of a
  singular `pair`/`currency` (mismatch I7, `docs/spikes/CROSS-B-discovery.md:170-174`).

## Alternatives considered

**Keeping SP12's older field names.** Rejected because SP06 owns the schema and the closed-schema
check rejects unknown keys and enum values outside SP01's catalog (`forbidNonWhitelisted`,
`docs/spikes/SP06-prompt-to-search-contract.md:108-109`); SP12's adapter cannot emit the names SP06
rejects, and SP12 itself defers to SP06.

**Leaving "cannot parse" out of the schema, as SP06 does (`SP06:150`).** Rejected because SP12's
failure budget depends on the parser being able to say it cannot parse rather than guessing
(`openspec/changes/spike-interface-reconciliation/design.md:52-54`).
