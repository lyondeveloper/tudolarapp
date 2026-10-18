import type { CursorPage } from '../../../../common/pagination/cursor-pagination';
import type { SearchMatch } from '../../../application/search.ports';
import type { SearchCriteria } from '../../../domain/search-criteria';

/**
 * The HTTP shapes of a search. The criteria DTO is the closed schema itself
 * (ADR-0003); the results use the one shared cursor-page shape.
 */
export type SearchCriteriaDto = SearchCriteria;

export interface SearchMatchDto {
  offerId: string;
  distanceMeters: number | null;
}

export type SearchResultsDto = CursorPage<SearchMatchDto>;

/** Maps an application search match to its transport shape. */
export function toSearchMatchDto(match: SearchMatch): SearchMatchDto {
  return {
    offerId: match.offerId,
    distanceMeters: match.distanceMeters,
  };
}
