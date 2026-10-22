declare const transactionContextBrand: unique symbol;

/** Opaque handle for one database transaction; adapters own its construction. */
export interface TransactionContext {
  readonly [transactionContextBrand]: never;
}

export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

/** Runs one application operation with a context shared by every participating port. */
export interface TransactionRunnerPort {
  run<T>(
    operation: (transaction: TransactionContext) => Promise<T>,
  ): Promise<T>;
}
