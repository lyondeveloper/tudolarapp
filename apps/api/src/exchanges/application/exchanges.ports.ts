import type { Agreement } from '../domain/exchange-state';

/**
 * The port the exchanges module owns. It consumes the offers terms-version
 * contract (an agreement references a `termsVersionId`, ADR-0001) and the
 * conversations contract.
 *
 * The concrete adapter lands with T13; this change freezes the port only.
 */
export const AGREEMENT_REPOSITORY = Symbol('AGREEMENT_REPOSITORY');

export interface AgreementRepositoryPort {
  findById(agreementId: string): Promise<Agreement | null>;
}
