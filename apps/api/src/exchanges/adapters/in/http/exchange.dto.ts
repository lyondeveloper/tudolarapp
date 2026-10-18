import type { Agreement, AgreementState } from '../../../domain/exchange-state';

/**
 * The HTTP shape of an agreement. It exposes the state (ADR-0004) and the
 * `termsVersionId` it references, never a copy of the terms.
 */
export interface AgreementDto {
  id: string;
  offerId: string;
  termsVersionId: string;
  state: AgreementState;
}

/** Maps the domain agreement to its transport shape. */
export function toAgreementDto(agreement: Agreement): AgreementDto {
  return {
    id: agreement.id,
    offerId: agreement.offerId,
    termsVersionId: agreement.termsVersionId,
    state: agreement.state,
  };
}
