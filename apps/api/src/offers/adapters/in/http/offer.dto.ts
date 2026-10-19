import type { PairId } from '../../../../catalog/catalog';
import type { CursorPage } from '../../../../common/pagination/cursor-pagination';
import {
  OfferTermsError,
  type Offer,
  type OfferTermsVersion,
} from '../../../domain/offer-terms-version';

export interface OfferTermsDto {
  version: number;
  giveAmount: string;
  receiveAmount: string;
  rate: string | null;
  marginPct: string;
  minAmount: string;
  maxAmount: string;
  expiresAt: string;
}

/**
 * The HTTP shape of an offer. It exposes the closed `pairId` from the shared
 * catalog (ADR-0009), the current terms-version id, and the seller's current
 * commercial terms. Amounts are exact decimal strings, never floating-point
 * numbers.
 */
export interface OfferDto {
  id: string;
  pairId: PairId;
  currentTermsVersionId: string;
  terms: OfferTermsDto;
}

/** The paginated offer collection, using the one shared cursor-page shape. */
export type OfferListDto = CursorPage<OfferDto>;

/** Maps an offer and its already-resolved current terms into the wire shape. */
export function toOfferDto(
  offer: Offer,
  currentTerms: OfferTermsVersion,
): OfferDto {
  if (
    currentTerms.offerId !== offer.id ||
    currentTerms.id !== offer.currentTermsVersionId
  ) {
    throw new OfferTermsError(
      'offer DTO requires its own current terms version',
    );
  }

  return {
    id: offer.id,
    pairId: currentTerms.pairId,
    currentTermsVersionId: currentTerms.id,
    terms: {
      version: currentTerms.version,
      giveAmount: currentTerms.giveAmount.toDecimalString(),
      receiveAmount: currentTerms.receiveAmount.toDecimalString(),
      rate: currentTerms.rate,
      marginPct: currentTerms.marginPct,
      minAmount: currentTerms.minAmount.toDecimalString(),
      maxAmount: currentTerms.maxAmount.toDecimalString(),
      expiresAt: currentTerms.expiresAt.toISOString(),
    },
  };
}
