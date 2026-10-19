import type { Agreement, AgreementState } from '../domain/exchange-state';
import type { TransactionContext } from '../../common/application/transaction.ports';

/**
 * The port the exchanges module owns. It consumes the offers terms-version
 * contract (an agreement references a `termsVersionId`, ADR-0001) and the
 * conversations contract.
 *
 * The concrete adapter lands with T13; this change freezes the port only.
 */
export const AGREEMENT_REPOSITORY = Symbol('AGREEMENT_REPOSITORY');

export interface AgreementRepositoryPort {
  findById(
    agreementId: string,
    transaction?: TransactionContext,
  ): Promise<Agreement | null>;
  /** Compare-and-set transition in the same transaction as the inventory change. */
  transition(
    agreementId: string,
    expectedState: AgreementState,
    nextState: AgreementState,
    transaction: TransactionContext,
  ): Promise<boolean>;
}
