/**
 * The MVP pair, asset, rail, and delivery catalog — pure domain, no
 * infrastructure imports (no NestJS, no Prisma, no Express).
 *
 * ADR-0005 settles the shape: a leg is the two-axis `{asset, rail, delivery}`,
 * a pair is an ordered `(give, receive)` of legs, and the API exposes the single
 * closed pair id. ADR-0009 fixes the members: three assets, four rails, five
 * pair ids, and the unqualified "VES" leg read as physical cash.
 *
 * This module owns the vocabulary. No other module may declare a pair, asset,
 * rail, or delivery type (design.md, module table).
 */

/** The three assets of the MVP catalog (ADR-0009). */
export type Asset = 'VES' | 'USD' | 'USDT';

/** The four rails of the MVP catalog (ADR-0009). */
export type Rail =
  'VES_CASH' | 'VES_BANK_TRANSFER' | 'USD_CASH' | 'USDT_TRANSFER';

/** A leg is physical (in-person handover) or digital (remote transfer). */
export type Delivery = 'physical' | 'digital';

/** The closed external allowlist of MVP pair ids (ADR-0009). */
export type PairId =
  | 'VES_USDT'
  | 'VES_BANK_TO_VES_CASH'
  | 'VES_USD_CASH'
  | 'USDT_VES'
  | 'USDT_USD_CASH';

/** One side of a pair, as the internal two-axis model of ADR-0005. */
export interface Leg {
  readonly asset: Asset;
  readonly rail: Rail;
  readonly delivery: Delivery;
}

/** A pair is an ordered `(give, receive)` of legs, keyed by its closed id. */
export interface Pair {
  readonly id: PairId;
  readonly give: Leg;
  readonly receive: Leg;
}

// The four MVP rails, each as the leg its asset/rail/delivery combination makes.
const VES_CASH: Leg = Object.freeze({
  asset: 'VES',
  rail: 'VES_CASH',
  delivery: 'physical',
});
const VES_BANK_TRANSFER: Leg = Object.freeze({
  asset: 'VES',
  rail: 'VES_BANK_TRANSFER',
  delivery: 'digital',
});
const USD_CASH: Leg = Object.freeze({
  asset: 'USD',
  rail: 'USD_CASH',
  delivery: 'physical',
});
const USDT_TRANSFER: Leg = Object.freeze({
  asset: 'USDT',
  rail: 'USDT_TRANSFER',
  delivery: 'digital',
});

/**
 * The five canonical pairs, in the catalog's canonical order. Every MVP pair is
 * in person, because every pair has at least one physical leg (ADR-0009).
 */
const PAIRS: Readonly<Record<PairId, Pair>> = Object.freeze({
  VES_USDT: Object.freeze({
    id: 'VES_USDT',
    give: VES_CASH,
    receive: USDT_TRANSFER,
  }),
  VES_BANK_TO_VES_CASH: Object.freeze({
    id: 'VES_BANK_TO_VES_CASH',
    give: VES_BANK_TRANSFER,
    receive: VES_CASH,
  }),
  VES_USD_CASH: Object.freeze({
    id: 'VES_USD_CASH',
    give: VES_CASH,
    receive: USD_CASH,
  }),
  USDT_VES: Object.freeze({
    id: 'USDT_VES',
    give: USDT_TRANSFER,
    receive: VES_CASH,
  }),
  USDT_USD_CASH: Object.freeze({
    id: 'USDT_USD_CASH',
    give: USDT_TRANSFER,
    receive: USD_CASH,
  }),
});

/** The five pair ids, in the catalog's canonical order. */
export const PAIR_IDS: readonly PairId[] = Object.freeze(
  Object.keys(PAIRS) as PairId[],
);

/** Thrown when a value is not one of the five canonical pair ids. */
export class UnknownPairError extends Error {
  constructor(pairId: string) {
    super(`Unknown pair id: ${pairId}`);
    this.name = 'UnknownPairError';
  }
}

/** Narrows an untrusted value to a pair id from the closed allowlist. */
export function isPairId(value: unknown): value is PairId {
  return typeof value === 'string' && Object.hasOwn(PAIRS, value);
}

/** Resolves a pair id to its ordered legs, rejecting anything outside the allowlist. */
export function getPair(id: string): Pair {
  if (!isPairId(id)) {
    throw new UnknownPairError(id);
  }
  return PAIRS[id];
}
