import type { PairId } from '../../../../catalog/catalog';
import type { CursorPage } from '../../../../common/pagination/cursor-pagination';

/**
 * The HTTP shape of an offer. It exposes the closed `pairId` from the shared
 * catalog (ADR-0009) and the current terms-version pointer, and it uses the one
 * shared cursor-page shape for the collection.
 */
export interface OfferDto {
  id: string;
  pairId: PairId;
  currentTermsVersionId: string | null;
}

/** The paginated offer collection, using the one shared cursor-page shape. */
export type OfferListDto = CursorPage<OfferDto>;
