# SP03 — Specify offer inventory, multi-buyer allocation, and replenishment

Research spike. No application code was written or changed; this report is evidence for the T01 review.

## 1. Task and acceptance criteria

Quoted from the backlog (`/tmp/backlog2.md:47-52`):

> ### SP03 — Specify Offer Inventory, Multi-Buyer Allocation, and Replenishment
> **Suggested owner:** Marketplace backend + data. **Depends on:** T00; independent spike, parallelizable.
> - Specify immutable initial amount after publication; seller-editable description/details; system-derived initial, reserved, completed, and available amounts; and atomic reservation when both parties confirm.
> - Preserve the rule that each buyer transaction is whole (no partial execution) while one offer may serve multiple buyers. Define when availability is hidden at zero and when a mutual cancellation restores it.
> - Investigate replenishment options without choosing one in advance. Assess that listed inventory is seller-declared and is not independently verified or escrowed.
>
> **Acceptance criteria:** the 500 USDT / 200 + 50 + 250 example, concurrent confirmations, cancellation, expiry, and depletion are modeled and tested; a recommendation and open decision for replenishment are documented.

The binding product constraint this spike must not contradict, quoted from T01 (`/tmp/backlog2.md:110`):

> One offer may serve multiple buyers through separate full transactions while availability remains; each transaction consumes the entire agreed amount and does not allow partial execution. The seller sets the initial amount when creating the offer and cannot change it after publication; availability changes automatically based on reservations, completed transactions, and mutual cancellations. The process for adding inventory after publication remains to be defined; do not assume replenishment or creation of additional offers. The exchange is directly between buyer and seller, with no intermediary managing or settling funds.

## 2. Evidence and sources

### 2.1 Observed

- **No offer or inventory code exists today.** `apps/api/README.md:17` ("marketplace offers … are not implemented"), `README.md:55`, `docs/architecture.md:57`, and `docs/audit/t00-baseline.md:214` (T07–T14 "Not implemented"). This spike is greenfield; there is no existing schema to preserve.
- **Product boundary — no custody, settlement, or escrow.** `README.md:9`, `AGENTS.md:11`, `docs/architecture.md:53`, `docs/flows/search-and-contact.md:53`. An exchange record "records coordination and does not settle or custody funds" (`docs/architecture.md:49`).
- **Multi-buyer, whole-transaction rule.** `backlog2.md:110` (quoted above). T01 also lists it as a fixed MVP rule.
- **Offer lifecycle states.** `docs/flows/seller-offer-lifecycle.md:3-26`: draft → validate → **active** (available in search) → pause/resume, → expire by time or manual close, and terminal completion/cancellation. `README.md:19` lists "expiration" as an offer attribute.
- **Availability moves on reservations, completions, and mutual cancellations.** `backlog2.md:110`.
- **Monetary storage.** `AGENTS.md:45` and `openspec/config.yaml:22`: `numeric`/decimal or integer minor unit, never binary floating point; scale, rounding, and currency defined explicitly.
- **Atomic-guard pattern.** `AGENTS.md:41`: where Prisma has no equivalent (`FOR UPDATE`, `GREATEST`, `RETURNING` as compare-and-swap) keep atomicity via `$queryRaw`/`$executeRaw` or an `updateMany` compare-and-swap; "never downgrade an atomic guard into a read-then-write."
- **Transaction scope.** `AGENTS.md:46`: one atomic business operation per transaction; invariants inside the transaction to prevent partial writes and races.
- **Constraints.** `AGENTS.md:39,43`: `CHECK` constraints are hand-written SQL inside `--create-only` migrations and verified against `pg_constraint`; use `NOT NULL`/`CHECK`/`UNIQUE` where the DB can enforce an invariant.
- **Search scope.** `docs/flows/search-and-contact.md:13-18` and `docs/architecture.md:48`: results are active offers within the selected market and geofence (SP05 owns the geofence).
- **E2E conventions.** `docs/testing/e2e.md:56-72`; `openspec/specs/testing/e2e-foundation/spec.md:9-111`; the API test style is `apps/api/test/auth.e2e-spec.ts:49-58`.
- **Spike protocol.** `docs/spikes/README.md:22-44` (sections, hard rules) and `:61` (SP03 row).

### 2.2 Assumed (inferred, not verified — flagged where they matter)

- **The reservation is created at the second confirmation, not earlier.** The task says "atomic reservation when both parties confirm," so no inventory is held during chat. The exact trigger point relative to SP04's agreement state machine is SP04's decision, not this spike's.
- **The arithmetic `available = initial − reserved − completed`.** The task lists the four amounts but never states the formula; the arithmetic below is an inference from that list and is consistent with `backlog2.md:110`.
- **"Hidden at zero" means excluded from search results**, not deleted and not a status change. `backlog2.md:110` and the task only say availability "changes automatically."
- **The 500 figure is in the offer's declared unit** (USDT here); the unit, scale, and rounding are SP02's decision.
- **A zero-availability offer's detail page and existing conversations remain reachable** to their participants. Not decided anywhere I read.
- **Whether expiry releases outstanding reservations** is not decided anywhere I read.

## 3. Options considered

### 3.1 Inventory model

**A. Stored counters on the offer (kept, recommended).** `initial_amount` (immutable), `reserved_amount`, `completed_amount`; `available_amount` computed. Cheap, indexable availability filter, and it maps directly onto the compare-and-swap guard in §3.2.
- Pros: single atomic UPDATE guards and mutates in one statement; search can filter on a numeric expression; matches `AGENTS.md:41`.
- Cons: denormalized — the counters can drift from the underlying reservation/agreement rows. Mitigate with `CHECK` constraints (`reserved_amount >= 0`, `completed_amount >= 0`, `reserved_amount + completed_amount <= initial_amount`) and reconciliation against the reservation ledger.
- **Kept.**

**B. Fully derived on read (no counters).** Compute `available` by aggregating agreements each time.
- Pros: no denormalization, no drift; the reservation rows are the only truth.
- Cons: every search and every guard needs an aggregate; the concurrency guard becomes harder to keep atomic and indexable. **Rejected** as the primary model; keep it as the reconciliation source.

**C. Separate double-entry inventory ledger.** Every reserve/complete/release is an append-only ledger row; balances are sums.
- Pros: strongest auditability and history; natural fit for SP11 history/earnings.
- Cons: more moving parts than the MVP needs; heavier read path. **Rejected for MVP**, recorded as a possible evolution once SP11 needs the history anyway.

**Chosen shape (technical, not a product rule):** store `initial_amount` (frozen at publication), `reserved_amount`, `completed_amount`; derive `available_amount`; keep the reservation/agreement rows as the audit source; enforce the non-negativity and non-oversell invariants with hand-written `CHECK` constraints (`AGENTS.md:39,43`).

### 3.2 Atomic reservation under concurrency

**D. Compare-and-swap UPDATE (kept, recommended).**
```sql
UPDATE offers
SET reserved_amount = reserved_amount + $amount
WHERE id = $offerId
  AND initial_amount - reserved_amount - completed_amount >= $amount
RETURNING id;
```
Zero rows returned ⇒ insufficient availability ⇒ reject the confirmation with a controlled conflict and do not enter `confirmed_by_both`. This is exactly the `RETURNING`-as-compare-and-swap the repository already endorses (`AGENTS.md:41`).
- Pros: one statement, no read-then-write window, no oversell. **Kept.**

**E. `SELECT … FOR UPDATE`, then check and write.**
- Pros: also correct, and clearer to read.
- Cons: two statements and a held row lock; `AGENTS.md:41` warns against downgrading an atomic guard into a read-then-write when a compare-and-swap exists. **Kept as an acceptable alternative**, not the first choice.

**F. Serializable isolation or a Postgres advisory lock.**
- Pros: strongest, generic.
- Cons: retries and lock-management overhead for a single-row invariant; heavier than needed. **Rejected for MVP.**

The reservation write and the agreement's transition to `confirmed_by_both` must be the same transaction (`AGENTS.md:46`). The reservation is keyed to the agreement, so re-sending the same confirmation must not reserve twice — idempotency is SP09's concern (`backlog2.md:84`) and this spike depends on it.

### 3.3 Counter transitions

| Event | reserved_amount | completed_amount | available_amount | Guard |
| --- | --- | --- | --- | --- |
| Reserve (2nd confirmation) | `+ amount` | — | `− amount` | `initial − reserved − completed ≥ amount` |
| Complete (bilateral) | `− amount` | `+ amount` | unchanged | `reserved ≥ amount` |
| Mutual cancellation | `− amount` | — | `+ amount` | `reserved ≥ amount` |

Completion and cancellation both decrease `reserved`; completion moves the amount into `completed` (so `available` is unchanged), cancellation returns it to `available`. Which incidents release a reservation, and whether any release is unilateral, is SP04's state machine (`backlog2.md:56`); this spike only requires that the release be atomic and guarded.

### 3.4 Replenishment options (investigate, do not choose)

- **R1 — No replenishment; publish a new offer.** Preserves immutability absolutely. Cost: loses the old offer's conversations and context, and T01 explicitly says not to assume creation of additional offers (`backlog2.md:110`).
- **R2 — Append-only replenishment ledger (technically preferred if replenishment is approved).** `initial_amount` stays immutable; separate `replenishment` rows (`amount`, actor, timestamp) append. `available = initial + Σ replenishments − reserved − completed`. Preserves the immutability rule, keeps an audit trail, and reuses the same guard.
- **R3 — Editable amount with versioning (SP02-style).** Each change is a new offer version; confirmed transactions snapshot the old version. Preserves the terms-snapshot rule but makes the amount no longer immutable.
- **R4 — Editable amount with an audit log and a floor.** Allow increases only above the committed total. Simplest, but weakens the immutability guarantee T01 states.

None is chosen. **R2 is the only option that satisfies immutability and is therefore the technical recommendation *if* replenishment is approved**, but whether replenishment is allowed at all is a product decision (see §5).

## 4. Recommendation

1. **Model.** `initial_amount` frozen at publication; `reserved_amount` and `completed_amount` stored counters updated only inside the atomic transaction that changes the agreement; `available_amount = initial_amount − reserved_amount − completed_amount` derived, never stored. Enforce `reserved_amount >= 0`, `completed_amount >= 0`, and `reserved_amount + completed_amount <= initial_amount` as hand-written `CHECK` constraints (`AGENTS.md:39,43`).
2. **Reservation.** Created atomically at the second confirmation, in the same transaction that flips the agreement to `confirmed_by_both`, using the compare-and-swap in §3.2/D. On a failed guard, the confirmation is rejected with a controlled conflict and the agreement does not become confirmed.
3. **Whole transactions.** Each agreement reserves its entire agreed amount; there is no partial reserve. One offer serves many agreements until `available_amount` is exhausted.
4. **Visibility.** An offer appears in search iff it is active, not expired, and `available_amount > 0` (plus market/geofence filters, SP05). At zero it is hidden; a mutual cancellation raises `available_amount` and restores it. Completion does not change availability.
5. **Honesty.** `available_amount` is a platform bookkeeping claim about reservations, not a guarantee the seller holds the currency. The platform does not verify or escrow inventory (`README.md:9`, `AGENTS.md:11`); the UI must not present availability as a guarantee (SP07 covers misleading claims, `backlog2.md:73`).
6. **Replenishment.** Not adopted. Recommend R2 (append-only ledger) if the product owner approves replenishment; the decision itself is open (§5).

Worked example — 500 USDT, `200 + 50 + 250` (offer's unit; scale is SP02's):

| Step | Event | reserved | completed | available | In search? |
| --- | --- | --- | --- | --- | --- |
| 0 | Published, initial 500 | 0 | 0 | 500 | yes |
| 1 | Buyer A confirms 200 | 200 | 0 | 300 | yes |
| 2 | Buyer B confirms 50 | 250 | 0 | 250 | yes |
| 3 | Buyer C confirms 250 | 500 | 0 | 0 | **no (hidden)** |
| 4 | A's 200 transaction completes | 300 | 200 | 0 | no |
| 5 | C's 250 mutually cancelled | 50 | 200 | 250 | **yes (restored)** |

Concurrent confirmations — initial 500, reserved 200 (available 300); A and B each confirm 250 at the same instant: the first compare-and-swap succeeds (reserved 450, available 50); the second finds `50 >= 250` false, returns zero rows, and is rejected. Exactly one new transaction results, deterministically, regardless of arrival order. A request larger than the available amount (600 against 500) is rejected the same way.

## 5. Unresolved decisions

- **U1 — Is replenishment allowed at all?** Owner: product owner (T01), with marketplace backend + data. If yes, adopt R2; if no, R1 (new offer) — which is itself not yet approved.
- **U2 — Which offer fields are editable after publication?** SP03 fixes only: amount immutable, description/details editable. The full editable-field list and material-change versioning are SP02's decision (`backlog2.md:45-46`). Owner: SP02 / product owner.
- **U3 — Does expiry release outstanding reservations, and does an expired offer with a nonzero reserved amount stay hidden?** Owner: SP04 (`backlog2.md:56`) + product owner.
- **U4 — When a confirmation fails the availability guard, what does the user see, and does the agreement return to negotiation or become invalid?** Owner: SP04 + product/UX.
- **U5 — Is a zero-availability offer hidden only from search, or also from the offer detail page and from chats already open on it?** Owner: product owner / UX (SP06/SP10).
- **U6 — Is a partially-available offer shown with an "only X available" badge when it cannot cover a searched amount, or excluded?** Owner: SP06 + product owner.
- **U7 — Is there any time limit on a reservation (a confirmed agreement that never completes)?** Owner: SP04.
- **U8 — Amount unit, scale, and rounding per asset (USDT vs VES vs USD cash).** Owner: SP02.
- **U9 — Idempotency of the confirmation request (retry must not double-reserve).** Owner: SP09 (`backlog2.md:84`).
- **U10 — Which reservations count toward `reserved_amount` across SP04 states** (e.g. reconfirmation after a terms change). Owner: SP04.

## 6. Product and technical impact

- **Product.** Sellers get a simple mental model: set the amount once, it cannot be changed, and the app tracks how much is left. Buyers get whole transactions and cannot be partially served. The "500 USDT" case shows one offer serving three buyers with no oversell. Because inventory is seller-declared and unescrowed, availability is a coordination signal, not a promise — the UI and copy must say so, and SP07 must guard against misleading claims.
- **Technical.** Adds an offer-inventory capability (new module under `apps/api/src/`, following the hexagonal shape in `AGENTS.md:54-70`) with: immutable `initial_amount`; guarded `reserved_amount`/`completed_amount`; a compare-and-swap reserve; a derived `available_amount` used by the search filter; and `CHECK` constraints in a `--create-only` Prisma migration verified against `pg_constraint` (`AGENTS.md:39`). The reserve path is a critical section and must stay a single atomic statement inside one transaction (`AGENTS.md:41,46`). The availability filter interacts with the SP05 geofence query and must be validated with a real plan.
- **Sequencing.** This is greenfield; nothing is blocked, but the schema lands with the offers module (T07–T14, `docs/audit/t00-baseline.md:214`) after T01/T02 and depends on SP02 (units/terms), SP04 (agreement states), SP05 (search scope), and SP09 (idempotency).

## 7. Testable scenarios

API e2e (`apps/api/test/`, following `docs/testing/e2e.md:56-61`), one fresh identifier per scenario:

1. **Immutable initial amount.** WHEN a seller updates an offer's amount after publication THEN the request is rejected and `initial_amount` is unchanged.
2. **Editable details.** WHEN a seller edits the description/details THEN the change persists and existing confirmed transactions' terms are unchanged.
3. **Whole transaction.** WHEN a buyer confirms 200 against a 500 offer THEN exactly 200 is reserved and `available_amount` is 300 (never a partial amount).
4. **Over-request rejected.** WHEN a buyer confirms 600 against a 500 offer THEN no reservation is created and the response is a controlled conflict.
5. **500 / 200 + 50 + 250.** WHEN three buyers confirm 200, then 50, then 250 THEN `reserved_amount = 500`, `available_amount = 0`, and the offer is absent from search.
6. **Concurrent confirmations.** WHEN two buyers each confirm 250 against available 300 at the same time THEN exactly one succeeds, `reserved_amount = 450`, `available_amount = 50`, and the other gets a conflict with no reservation.
7. **Depletion hides.** WHEN `available_amount` reaches 0 THEN the offer is not returned by search.
8. **Mutual cancellation restores.** WHEN a confirmed 200 transaction is mutually cancelled THEN `reserved_amount` drops by 200, `available_amount` rises by 200, and the offer reappears in search (if active and unexpired).
9. **Completion conserves availability.** WHEN a confirmed 200 transaction completes THEN `reserved_amount −200`, `completed_amount +200`, `available_amount` unchanged.
10. **No oversell ever.** WHEN reservations are attempted past the initial amount by any interleaving THEN `reserved_amount + completed_amount ≤ initial_amount` holds after every request.
11. **No custody side effects.** WHEN any reserve/complete/cancel transition occurs THEN no funds move and no settlement record is written (asserts `README.md:9`).
12. **Expiry.** WHEN the offer expires THEN no new reservation is accepted (and, once U3 is decided, assert whether outstanding reservations are released).
13. **Replenishment guard (until decided).** WHEN the amount is exhausted THEN no implemented path mutates `initial_amount`; a replenishment attempt is rejected until the decision in U1 lands.

## 8. Sources reviewed

- `docs/spikes/README.md` (protocol, deliverable, hard rules, SP03 row)
- `/tmp/backlog2.md` — SP03 (`:47-52`), T01 multi-buyer rule (`:110`), E2E gate (`:16`, `:26`), spike rules (`:35`)
- `AGENTS.md` (product context, PostgreSQL/PostGIS rules, hexagonal rules, security)
- `README.md`, `apps/api/README.md`
- `docs/architecture.md`
- `docs/flows/seller-offer-lifecycle.md`, `docs/flows/search-and-contact.md`
- `docs/testing/e2e.md`
- `docs/audit/t00-baseline.md`
- `openspec/config.yaml`; `openspec/specs/testing/e2e-foundation/spec.md`
- `apps/api/prisma/schema.prisma`; `apps/api/test/auth.e2e-spec.ts`
