# CROSS-A — Transaction lifecycle cross-check (SP03 · SP04 · SP11 · SP09)

Analysis only. This file does not implement anything, changes no application code, and grounds every
claim in a report line reference. It is a reconciliation of four reports that were written **in
parallel and did not read each other** (`docs/spikes/SYNTHESIS.md:58-63`), so it deliberately does
not restate them; it records where they meet.

Cluster: SP03 (offer inventory/allocation), SP04 (agreement/cancellation/incident state machine),
SP11 (seller history/daily earnings), SP09 (technical feasibility/test architecture). SP09 is a
technical report, but it is in this cluster because it specifies the **mechanism** (reservation CAS,
idempotency, terms-version storage) that SP03 and SP04 specify the **policy** for.

## 0. Fixed constraints applied to this cluster

Three product-owner decisions are treated as constraints (from the task brief; recorded in
`SYNTHESIS.md:141-148`). Where one invalidates a report, it is flagged inline below and summarised
here.

- **(a) Zelle is removed; 5 pairs remain** (VES → USDT, VES bank → VES cash, VES → USD cash,
  USDT → VES, USDT → USD cash). Within this cluster only **SP11** names Zelle: it assumes "Zelle and
  USD cash are distinct display buckets" (`SP11:80-82`) and carries an open decision "Whether USD
  cash and Zelle (both USD) share one bucket or stay separate" (`SP11:198`). **Both are now void** —
  with Zelle gone, only USD cash remains as a USD bucket, so SP11's mixed-asset display is at most
  three buckets (VES, USDT, USD cash). SP11's own mixed-asset scenario already uses exactly those
  three (`SP11:239`), so its recommendation survives; only the Zelle question dies. The pair enum
  that feeds SP04's snapshot field list (`SP04:180`) and SP11's history filters (`SP11:161`) shrinks
  from ten to five. SP03, SP04, and SP09 never name Zelle and are structurally unaffected.
- **(b) Daily earnings bucket on market-local time (America/Caracas, UTC−4).** This **confirms**
  SP11's recommendation of a "Market-local civil day … candidate `America/Caracas`, UTC−4"
  (`SP11:122-125`) and its explicit rejection of device-local days (`SP11:128-129`). It **voids**
  SP11's open decision "Timezone and day boundary confirmation (recommend `America/Caracas`, local
  00:00)" (`SP11:197`). SP11 stores instants as `timestamptz` and computes the local day at read time
  (`SP11:180-181`), which is compatible. No report in the cluster contradicts it.
- **(c) Stored inventory counters are adopted** (one-writer-same-transaction + CHECK + asserted
  reconciliation). This **confirms** SP03's recommendation (`SP03:51-64`, `SP03:110-115`) and SP09's
  invariant recommendation (`SP09:125-128`), and **voids SP09's U1** "Availability data model: stored
  counters vs derived" (`SP09:239`) as an open question. The "asserted reconciliation" is exactly the
  reconciliation source SP03 already names (`SP03:58` "keep it as the reconciliation source";
  `SP03:110` "keep the reservation/agreement rows as the audit source").

## 1. Agreements — independently reached, same conclusion

These are the strongest signals: two or more reports reached the same conclusion without reading each
other. Each is named and grounded.

- **A1 — Reservation is a single-statement compare-and-swap inside one short transaction, taken at
  the second confirmation.** Three-way. SP03 gives the exact SQL:
  `UPDATE offers SET reserved_amount = reserved_amount + $amount WHERE … initial_amount − reserved_amount − completed_amount >= $amount RETURNING id`
  (`SP03:68-76`). SP04 requires "atomically reserve amount" at T3 and states the transition "must be a
  compare-and-swap so concurrent confirmations cannot over-reserve" (`SP04:147`, `SP04:189`). SP09
  independently lands on the same shape — "Single-statement CAS with `RETURNING` … mirrors the
  sanctioned `RETURNING`-as-CAS in `AGENTS.md:41`" (`SP09:111-114`) — and anchors it to existing code
  (`rotateSession`, `consumeAuthChallenge`, `SP09:47-54`). All three cite the same repository rule
  (`AGENTS.md:41`, "never downgrade an atomic guard into a read-then-write"). This is the cluster's
  load-bearing agreement.
- **A2 — Terms changes must produce an immutable, referenced version, never an overwrite.** SP04
  recommends "Immutable `agreement_terms_version` rows" and explicitly rejects overwriting a snapshot
  because it "destroys the audit trail and lets a change silently alter confirmed terms" (`SP04:60-61`).
  SP09 recommends an "Append-only `offer_terms_versions` table … edits insert, never update" and
  rejects mutating the offer row for the same reason (`SP09:143-150`). SP11 consumes the same object
  as an "immutable snapshot" (`SP11:41-45`). (The two producers disagree on the version's *parent* —
  see C1.)
- **A3 — No report may imply custody, escrow, settlement, or a "verified" exchange.** SP04 keeps
  "confirmed," "completed," and "verified" distinct and states the platform "has no custody, escrow,
  or settlement and cannot attest that the exchange occurred" (`SP04:161-169`). SP11 refuses to label
  anything "profit"/"verified earnings" for the same reason and requires the summary to state the
  platform does not verify (`SP11:13`, `SP11:170-172`). SP03 says availability "is a platform
  bookkeeping claim … not a guarantee the seller holds the currency" (`SP03:114`). Three independent
  restatements of `AGENTS.md:11`.
- **A4 — Money is exact decimal or integer minor units, never floating point; scale/rounding
  explicit.** SP03 (`SP03:30`), SP04 (`SP04:189` "Money in the snapshot uses `numeric`/minor units"),
  SP11 (`SP11:31-34`, `SP11:174-178`), and SP09 (`SP09:246`) all cite the same rule (`AGENTS.md:45`)
  and none proposes a float. Four-way.
- **A5 — The confirmation must be idempotent; a retry must not reserve twice.** SP03 states it
  outright — "re-sending the same confirmation must not reserve twice — idempotency is SP09's concern"
  (`SP03:87`) — and SP09 designs for it with a unique constraint on the transition event so a replay
  is absorbed like the existing `P2002` handling (`SP09:130-139`). SP04's per-party confirmation
  model (`SP04:54`) is the object that makes one confirmation per party per version checkable. (The
  *ownership* of the idempotency key is dropped between them — see M3.)
- **A6 — Counter arithmetic on complete/cancel is identical in all three producers.** SP03's
  transition table gives Complete = `reserved −, completed +, available unchanged` and Mutual
  cancellation = `reserved −, available +` (`SP03:91-95`). SP04's T7 says "reservation → completed;
  `completed += amount`" and T10 says "release reservation → `availability += amount`" (`SP04:151`,
  `SP04:154`). SP11's scenarios assert the same observable outcomes (`SP11:234-236`). Three-way.
- **A7 — Reuse existing repository persistence conventions.** SP04 (`SP04:28`) and SP11
  (`SP11:63-68`) independently cite the same `schema.prisma` conventions (UUID PKs via
  `gen_random_uuid()`, `@db.Timestamptz(6)`, snake_case `@map`, string `status`, `Json` context), and
  SP09 describes the same migration/schema reality (`SP09:62-79`). This is why A2's version rows and
  the counters can be added without a new pattern.

## 2. Conflicts — incompatible assumptions or disagreements

- **C1 — The immutable terms version has two different parents.** SP04 puts the version on the
  **agreement**: `agreement_terms_version` rows "with a monotonic `version` int" and a `snapshot`
  (`SP04:60`), created when the agreement is proposed ("freeze snapshot v1", `SP04:145`) and recreated
  as vN+1 on a change (`SP04:148`). SP09 puts the version on the **offer**: "the offer row points at
  the current version and every confirmation/agreement stores the version id it agreed to"
  (`SP09:143-145`), with a unique `(offer_id, version)` and an offer→current-version FK (`SP09:152`).
  These cannot both be the source of truth: SP04's T4 mutates the agreement's version, SP09's model
  mutates the offer's version. **SP09 is correct.** T13 states the record is created when both
  "confirm the same version of the offer's complete terms" (`backlog2.md:201`), and SP02 makes
  *material offer changes* the versioned event (`backlog2.md:45-46`); the version therefore belongs to
  the offer. SP04's `agreement_terms_version` should be re-pointed to reference an offer version id
  (SP09's own §3.3/B already allows "a denormalized copy of the referenced version, not the source",
  `SP09:146-147`). This is the cluster's most important conflict.
- **C2 — Reconfirmation's reservation handling: SP04's wording can double-count, SP03's model
  forbids it.** SP04 leaves the reservation open at T4 (`SP04:148` "reservation handling OPEN") but
  T5's side effect is "reserve/re-reserve atomically" (`SP04:149`). SP03's counter is keyed one-per
  agreement — "The reservation is keyed to the agreement, so re-sending the same confirmation must
  not reserve twice" (`SP03:87`) — so a literal "re-reserve" on T5 that does not first release the old
  reservation inflates `reserved_amount` for that agreement. **SP03 is correct**: the counter is a sum
  over agreements, so a terms change must *adjust by delta* or *release-then-reserve*, not add a
  second reservation. The fixed reconciliation (constraint c) would catch the drift, which is
  precisely why the trigger must be defined before F01/T13 land.
- **C3 — Who owns the idempotency key is mutually delegated and lands on no one.** SP03 assigns it to
  SP09 ("idempotency is SP09's concern", `SP03:140`), and SP09 assigns it to SP04 ("Idempotency-key
  semantics, retention, and the conflict status code … Owner: SP04 → T02", `SP09:240`). SP04 does not
  mention idempotency anywhere. **Neither SP03 nor SP09 is correct to defer** — the responsibility is
  dropped. The confirmation endpoint is exactly the write that crosses a network boundary and can be
  retried (SP09's own criterion for a persisted key, `SP09:136-137`), so the key must be owned by the
  backend contract (T02), not left floating between two spikes.

## 3. Interface mismatches — an output that must feed another and does not line up

- **M1 — SP11 names states that SP04 does not have.** SP11 admits it assumed the status names
  (`SP11:75-77` "uses the labels the backlog already states"). Concretely SP11's status set is
  "completed … Mutually cancelled … Disputed/incident" (`SP11:164-167`) and "cancelled" (`SP11:143`),
  while SP04's actual proposed enum is `awaiting_confirmation`, `confirmed_by_both`, `completed`,
  `cancelled`, `incident_open`, `expired` (`SP04:103-110`). So: SP11 says **"mutually cancelled"**,
  SP04 names the state **`cancelled`**; SP11 says **"disputed"**, SP04 names it **`incident_open`**;
  SP11 never mentions **`awaiting_confirmation`** or **`expired`** at all. F01 renders "SP11's approved
  status" from "immutable transaction records" (`backlog2.md:248`), so this mapping must be fixed to
  SP04's enum before F01.
- **M2 — SP11 treats "incident" as a transaction status; SP04 makes it a separate entity plus a
  state.** SP04 recommends "A separate `incident` entity" with `type ∈ {no_show, payment_problem,
  safety, counterfeit, other}` and its own lifecycle `status ∈ {open, under_review, resolved,
  dismissed}` (`SP04:72`), and only `incident_open` is an agreement state (`SP04:109`). SP11 models
  "Disputed/incident" as a single status flag on a history row (`SP11:166-167`) and delegates the
  representation back to SP04 (`SP11:196`). The history row needs to say which incident type(s) and
  which moderation lifecycle it is in; SP11's shape cannot carry that.
- **M3 — SP09's idempotency design needs a per-party confirmation *row*; SP04 recommends per-party
  *columns*.** SP09's option A is "a unique constraint on the transition event (e.g. one confirmation
  row per party per agreement) so a replay violates `P2002`" (`SP09:132-134`). SP04 recommends "Two
  nullable timestamps (`buyer_confirmed_at`, `seller_confirmed_at`) + a derived `status`"
  (`SP04:54`). A unique index needs rows; columns cannot be uniquely constrained per party per
  version. If SP04's recommendation wins, SP09's primary idempotency mechanism has nothing to key on,
  and the idempotency key must move to SP09's option B (a persisted request key, `SP09:136-137`).
- **M4 — "reserved" has no shared definition, so the counter cannot be reconciled.** SP03's
  `reserved_amount` is a single amount per agreement (`SP03:87`), guarded by
  `reserved + completed <= initial` (`SP03:53`). SP04 has states where a reservation may or may not be
  held: `confirmed_by_both` holds (`SP04:106`), `incident_open` is "held or released — §5 U1"
  (`SP04:109`), and after T4 the reservation is "OPEN" (`SP04:148`). SP03 explicitly asks SP04 to
  define "Which reservations count toward `reserved_amount` across SP04 states" (`SP03:141`), and SP09
  independently lists "the meaning of 'reserved'" as open (`SP09:239`). Three reports each point at
  another for the definition; the reconciliation assertion (constraint c) has no predicate until this
  is fixed.
- **M5 — The failed-guard contract is split across three reports and unowned end to end.** SP03
  requires "a controlled conflict" with no reservation and the agreement not becoming confirmed
  (`SP03:76`, `SP03:111`), and asks what the user sees and whether the agreement "return to
  negotiation or become invalid" (`SP03:135`). SP09 proposes the HTTP shape — "insufficient inventory
  → 409" (`SP09:231`) — and separately lists "the conflict status code" as open under SP04→T02
  (`SP09:240`). SP04 never names the error or the post-failure state. The status code, the error body,
  and the resulting agreement state are three different reports' assumptions.

## 4. Gaps — neither owns, or each assumes the other does

- **G1 — Reservation time limit for a *confirmed* agreement that never completes.** SP03 delegates
  "Is there any time limit on a reservation (a confirmed agreement that never completes)?" to SP04
  (`SP03:138`). SP04's expiry decision is only about *unconfirmed* agreements — "an unconfirmed
  agreement passed its window" (`SP04:110`, `SP04:177`). Nobody owns the confirmed-but-stuck
  reservation; it is only reachable today through the incident/withdraw path, whose release trigger is
  itself open (G2).
- **G2 — The incident→release trigger that SP03's counter arithmetic depends on.** SP03 says "Which
  incidents release a reservation, and whether any release is unilateral, is SP04's state machine"
  (`SP03:97`). SP04 leaves it as its headline open decision, options A/B/C (`SP04:77-80`). Until it is
  chosen, SP03's guarded UPDATE has no defined input on the incident path — the arithmetic and the
  state machine cannot be implemented independently.
- **G3 — A moderation-driven completion bypasses SP03's counter path.** SP03 defines Complete only as
  "Complete (bilateral)" (`SP03:94`, `SP03:112`). SP04's T13 lets moderation resolve an incident as
  `completed` *or* `cancelled` (`SP04:157`). If moderation marks `completed`, the counter must still
  move `reserved → completed`; SP03's model has no transition for a non-bilateral completion, so the
  two reports do not compose on this edge.
- **G4 — The history has no defined row for `awaiting_confirmation` or `incident_open` detail.**
  SP11's status list covers completed / pending(`confirmed_by_both`) / cancelled / incident
  (`SP11:142-147`) but not `awaiting_confirmation` (a one-sided proposal the seller may want to see)
  nor the incident's moderation lifecycle from M2. F01's row shape (`backlog2.md:250`) is therefore
  underspecified for two of SP04's six states.
- **G5 — "Corrections" is in SP11's acceptance criteria and owned by no one.** SP11's AC requires
  "bilateral completion and corrections/cancellations" (`SP11:15`), but SP11's options define no
  correction path, and SP04 has no "correction" transition — only incident/moderation (`SP04:143-159`).
  Either "correction" means the moderation resolution in G3 (and should be said so) or it is an
  unowned requirement.
- **G6 — Which version's amount a completed exchange contributes to the daily summary.** SP11 sums
  "total agreed volume" of completed exchanges (`SP11:169`) from "the immutable snapshot"
  (`SP11:41`). If terms changed across versions (SP04 T4/T5, `SP04:148-149`), the summary must use the
  *finally confirmed* version's amount; SP11 does not say which snapshot wins, and SP04 does not name
  the field the summary reads.
- **G7 — The market record must carry the IANA zone, but the market is not this cluster's.** SP11
  recommends deriving the day from "the market's stored IANA zone" (`SP11:180`) and the fixed
  constraint (b) requires it, but the market entity is SP05/T04's (`backlog2.md:143-147`); no report in
  this cluster owns adding a `timezone` field to the market, and SP11 only assumes it exists.

## 5. Consolidated open decisions (re-keyed; local U-numbers discarded)

The reports' own `U1…Un` collide across reports (`SYNTHESIS.md:66-70`) and are not reused. Each
decision below is described in words with its owner. Overlaps between reports are merged into one row.

**Product / scope — owner: product owner (T01)**

- **D1 — Is replenishment allowed at all, and if so under which model?** SP03 recommends the
  append-only ledger if approved, but does not adopt it (`SP03:101-106`, `SP03:132`). *Owner: product
  owner, with marketplace backend + data.*
- **D2 — Which offer fields are editable after publication, and how material changes are versioned?**
  SP03 fixes only amount-immutable / details-editable (`SP03:133`); the full list and versioning are
  SP02's (`SP04:180`). *Owner: SP02 / product owner.*
- **D3 — Does an offer's expiry release outstanding reservations, and does an expired offer with a
  nonzero reserved amount stay hidden?** (`SP03:134`). *Owner: product owner + backend.*
- **D4 — UX when a confirmation loses the availability guard: what does the user see, and does the
  agreement return to negotiation or become invalid?** Merged with the conflict status code
  (`SP03:135`; `SP09:240`, `SP09:231`). *Owner: product owner/UX + backend.*
- **D5 — Is a zero-availability offer hidden only from search, or also from its detail page and from
  chats already open on it?** (`SP03:136`). *Owner: product owner / UX (SP06/SP10).*
- **D6 — Is a partially-available offer shown with an "only X available" badge, or excluded?**
  (`SP03:137`). *Owner: SP06 + product owner.*
- **D7 — Is there a time limit on a reservation (a confirmed agreement that never completes)?** (G1;
  `SP03:138`). *Owner: product owner + backend (SP04).*
- **D8 — Does a single-party incident report release the reservation, or only mutual cancellation or
  moderation?** SP04 calls this "the single most consequential choice in the machine" (`SP04:80`,
  `SP04:175`). *Owner: product owner + trust & safety.* **The cluster's most important open decision.**
- **D9 — During reconfirmation, is the reservation held or released?** (C2; `SP04:176`). *Owner:
  product owner + backend.*
- **D10 — Which SP04 states count toward `reserved_amount`?** (M4; `SP03:141`, `SP04:176`). *Owner:
  product owner + backend.*
- **D11 — Do unconfirmed agreements expire, and after what window?** (`SP04:177`). *Owner: product
  owner.*
- **D12 — Entity/module name: `Agreement` vs `Exchange`/`ExchangeRecord`?** (`SP04:178`). *Owner:
  product owner + architect (T02).*
- **D13 — Who may initiate an agreement, and must a chat conversation precede it?** (`SP04:179`).
  *Owner: product owner.*
- **D14 — The exact terms-snapshot field list.** (`SP04:180`; pair enum now five, constraint a).
  *Owner: product owner + SP02.*
- **D15 — Incident evidence, severity, SLA, and appeal.** (`SP04:181`). *Owner: trust & safety (SP07).*
- **D16 — Are incidents visible to the counterparty, and what do they see?** (`SP04:182`). *Owner:
  product owner + trust & safety.*

**Earnings / history — owner: product owner (+ SP11)**

- **D17 — Which statuses feed the daily summary?** Merged (`SP04:183`; `SP11:169`). *Owner: product
  owner + SP11.*
- **D18 — Is the seller's own margin displayed as "earnings", and under what label?** (`SP11:193`).
  *Owner: product owner.*
- **D19 — Is there a reporting threshold before a summary shows?** (`SP11:194`). *Owner: product owner.*
- **D20 — Any cross-currency total: which approved conversion source and timestamp?** (`SP11:199`).
  *Owner: product owner, with SP02.*
- **D21 — Retention period and anonymization rule for history and incidents.** (`SP11:200`). *Owner:
  product owner + legal.*
- **D22 — Which counterparty identity fields are shown (public display name only?).** (`SP11:201`).
  *Owner: product owner / trust & safety.*

**Pricing / money — owner: SP02 (+ T02/T03)**

- **D23 — Amount unit, scale, and rounding per asset; and the margin's semantics (absolute,
  percentage, or spread).** Merged (`SP03:139`; `SP11:195`). *Owner: SP02 / product owner.*
- **D24 — Decimal column vs integer minor unit in the schema.** (`SP11:202`, `SP09:246`). *Owner:
  backend (T02/T03).*

**State machine / contract — owner: SP04 → T02**

- **D25 — The exact exchange status enum, and how a disputed/incident state is represented.** Merged
  with M1/M2 (`SP11:196`; `SP04:103-110`). *Owner: SP04 + product owner.*
- **D26 — Idempotency of the confirmation: key semantics, retention, and the conflict status code.**
  Merged and re-owned from C3 (`SP03:140`; `SP09:240`). *Owner: backend contract (T02).*
- **D27 — Terms-version storage shape and whether immutability is enforced by a trigger or
  app-only.** (`SP09:241`). *Owner: SP02 → T03.*

**Technical, outside this cluster but consumed here — owner: T02/T03 + ops**

- **D28 — PostGIS provisioning authority and the `Unsupported("geometry")` mapping.** (`SP09:243`,
  `SP09:245`). *Owner: T02/T03 + ops.*
- **D29 — Integration-test file convention (`*.int-spec.ts` vs folding into e2e).** (`SP09:244`).
  *Owner: T02 + QA.*
- **D30 — Market timezone storage (IANA zone on the market entity), now constrained to market-local.**
  (G7; `SP11:180`, constraint b). *Owner: T04/SP05 + backend.*

## 6. Sources reviewed

- `docs/spikes/README.md` (protocol, hard rules, sections).
- `AGENTS.md` (product context; PostgreSQL/PostGIS; hexagonal; security).
- `/tmp/backlog2.md` — SP03 (47–52), SP04 (53–58), SP09 (81–86), SP11 (92–98), T01 (110–116),
  T09 (175–180), T13 (199–206), F01 (246–252).
- `docs/spikes/SP03-offer-inventory-allocation.md`, `SP04-agreement-cancellation-incidents.md`,
  `SP11-seller-transaction-history-earnings.md`, `SP09-technical-feasibility-test-architecture.md`
  (each in full).
- `docs/spikes/SYNTHESIS.md` (fixed decisions 141–148; the collision warning 66–70).
