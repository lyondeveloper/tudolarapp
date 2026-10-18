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
  /**
   * Orders an item against a cursor position: a positive result means the item
   * follows that position in the total order. The cursor is resolved as a
   * *position*, not as a reference to a row, so a page still resumes after an
   * anchor that has since been deleted, hidden, or expired. It must agree with
   * `compare`: a positive result here means `compare` would place the item after
   * the anchor it was derived from.
   */
  compareCursor: (item: T, cursor: CursorPayload) => number;
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
 * cursor then names a *position* in that order (not a row), and `nextCursor` is
 * `null` on the final page. A malformed cursor is rejected by `decodeCursor`;
 * a well-formed one whose anchor has since disappeared still resolves.
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
    // Resolve the cursor as a position: the next page starts at the first item
    // that sorts after it, whether or not the row it was built from still
    // exists. A deleted, hidden, or expired anchor therefore resumes the walk
    // instead of turning an ordinary "next page" into a 400.
    //
    // NOTE(T10): this in-memory scan is a stopgap. The offers query must push
    // the seek into SQL — `WHERE (sort_key, id) > ($k, $i)
    // ORDER BY sort_key, id LIMIT $limit + 1` — rather than materializing and
    // sorting the whole collection here (docs/audits/scalability.md H1/H2).
    const index = ordered.findIndex(
      (item) => options.compareCursor(item, payload) > 0,
    );
    start = index === -1 ? ordered.length : index;
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
