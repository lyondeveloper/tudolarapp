import type {
  CursorPage,
  PageQuery,
} from '../../common/pagination/cursor-pagination';
import type { SearchCriteria } from '../domain/search-criteria';

/**
 * The ports the search module owns. It imports the shared pagination contract
 * rather than redeclaring a page shape.
 *
 * The deterministic query adapter lands with T10. The natural-language parser
 * port is deliberately left **unimplemented** (ADR-0015): the MVP ships manual
 * filters only, so no adapter is bound to it and it is wired nowhere.
 */
export const SEARCH_QUERY_PORT = Symbol('SEARCH_QUERY_PORT');
export const NATURAL_LANGUAGE_PARSER_PORT = Symbol(
  'NATURAL_LANGUAGE_PARSER_PORT',
);

/** One match the deterministic query returns; a null distance means no proximity filter. */
export interface SearchMatch {
  readonly offerId: string;
  readonly distanceMeters: number | null;
}

export interface SearchQueryPort {
  search(
    criteria: SearchCriteria,
    page: PageQuery,
  ): Promise<CursorPage<SearchMatch>>;
}

/**
 * The natural-language parser port (ADR-0015). It exists so the deferral is a
 * **missing adapter rather than a redesign**: implementing natural-language
 * search later is adding an adapter, not reshaping this contract.
 *
 * It is wired nowhere — no provider is bound to `NATURAL_LANGUAGE_PARSER_PORT`
 * and no route exposes it. The model may only parse text into the closed,
 * typed criteria above; it must never generate SQL, own monetary rules, or
 * perform deterministic ranking (`AGENTS.md`).
 */
export interface NaturalLanguageParserPort {
  /** Parses free text into typed criteria, or an unparsed outcome. */
  parse(text: string): Promise<SearchCriteria>;
}
