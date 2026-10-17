import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';
import { decodeCursor, encodeCursor } from './cursor';
import type { CursorPayload } from './cursor';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** The one collection shape every paginated endpoint answers with. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** The `?limit&cursor` query a paginated endpoint accepts. */
export interface PageQuery {
  limit?: number;
  cursor?: string;
}

export interface CursorOptions<T> {
  /** Total, stable ordering: the page is sorted by it before it is sliced. */
  compare: (a: T, b: T) => number;
  /** The opaque cursor payload that identifies an item's position. */
  cursorOf: (item: T) => CursorPayload;
}

/**
 * Caps the page size. A missing or invalid limit falls back to the default and
 * a large one is clamped to the maximum, so no client can ask for an unbounded
 * read.
 */
export function resolvePageLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(limit, MAX_PAGE_SIZE);
}

/**
 * Slices a stably ordered page. The list is sorted by the caller's total
 * ordering first, so equal sort keys keep the same order on every page; the
 * cursor then names the last item returned, and `nextCursor` is `null` on the
 * final page.
 */
export function paginate<T>(
  items: readonly T[],
  query: PageQuery,
  options: CursorOptions<T>,
): CursorPage<T> {
  const limit = resolvePageLimit(query.limit);
  const ordered = [...items].sort(options.compare);

  let start = 0;
  if (query.cursor !== undefined) {
    const payload = decodeCursor(query.cursor);
    const index = ordered.findIndex((item) => {
      const key = options.cursorOf(item);
      return key.k === payload.k && key.i === payload.i;
    });
    if (index === -1) {
      throw new ApplicationError(ApiErrorCode.INVALID_CURSOR);
    }
    start = index + 1;
  }

  const pageItems = ordered.slice(start, start + limit);
  const hasMore = start + limit < ordered.length;
  const last = pageItems[pageItems.length - 1];

  return {
    items: pageItems,
    nextCursor:
      hasMore && last !== undefined
        ? encodeCursor(options.cursorOf(last))
        : null,
  };
}
