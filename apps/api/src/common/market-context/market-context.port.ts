/**
 * The port the market-context guard uses to decide whether a market exists.
 *
 * `common` owns the guard but not the market data, so the guard depends on this
 * interface and the `markets` module supplies the implementation. It is a
 * narrow read: the guard only needs to know whether the header names a real
 * market, never its polygon or its offers.
 */
export const MARKET_CONTEXT_PORT = Symbol('MARKET_CONTEXT_PORT');

export interface MarketContextPort {
  /** Whether `marketId` names a market that exists. */
  exists(marketId: string): Promise<boolean>;
}
