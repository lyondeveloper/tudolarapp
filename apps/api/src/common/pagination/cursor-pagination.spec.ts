import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginate,
  resolvePageLimit,
} from './cursor-pagination';
import type { CursorOptions, CursorPage } from './cursor-pagination';
import { decodeCursor, encodeCursor } from './cursor';

interface Offer {
  id: string;
  createdAt: string;
}

const CANONICAL: Offer[] = [
  { id: 'e', createdAt: '2026-01-05T00:00:00.000Z' },
  { id: 'd', createdAt: '2026-01-04T00:00:00.000Z' },
  { id: 'c', createdAt: '2026-01-03T00:00:00.000Z' },
  { id: 'b', createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 'a', createdAt: '2026-01-01T00:00:00.000Z' },
];

// Deliberately not in canonical order, so ordering cannot be incidental.
const UNSORTED: Offer[] = [
  CANONICAL[2],
  CANONICAL[0],
  CANONICAL[4],
  CANONICAL[1],
  CANONICAL[3],
];

const OPTIONS: CursorOptions<Offer> = {
  compare: (a, b) =>
    b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  cursorOf: (item) => ({ k: item.createdAt, i: item.id }),
  // Positional: a positive result means the item sorts after the cursor.
  compareCursor: (item, cursor) =>
    cursor.k.localeCompare(item.createdAt) || cursor.i.localeCompare(item.id),
};

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe('cursor pagination', () => {
  it('caps the page size and never exceeds the maximum', () => {
    expect(resolvePageLimit(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(resolvePageLimit(3)).toBe(3);
    expect(resolvePageLimit(MAX_PAGE_SIZE + 1_000)).toBe(MAX_PAGE_SIZE);
    expect(resolvePageLimit(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(resolvePageLimit(-5)).toBe(DEFAULT_PAGE_SIZE);
  });

  it('answers with the shared { items, nextCursor } shape and an opaque cursor', () => {
    const page: CursorPage<Offer> = paginate(UNSORTED, { limit: 2 }, OPTIONS);

    expect(Object.keys(page).sort()).toEqual(['items', 'nextCursor']);
    expect(page.items.map((item) => item.id)).toEqual(['e', 'd']);
    expect(page.nextCursor).toEqual(expect.any(String));

    const cursor = page.nextCursor as string;
    // Opaque: the client cannot read the sort key out of it.
    expect(BASE64URL.test(cursor)).toBe(true);
    expect(cursor).not.toContain('"k"');
    expect(cursor).not.toContain(CANONICAL[1].createdAt);
    expect(decodeCursor(cursor)).toEqual(OPTIONS.cursorOf(CANONICAL[1]));
  });

  it('orders stably and pages through the whole set without repeats', () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;

    for (let page = 0; page < 10; page += 1) {
      const result = paginate(UNSORTED, { limit: 2, cursor }, OPTIONS);
      pages += 1;
      expect(result.items.length).toBeLessThanOrEqual(2);
      seen.push(...result.items.map((item) => item.id));
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }

    // 5 items at 2 per page is exactly three pages, so the cap is real.
    expect(pages).toBe(3);
    expect(seen).toEqual(CANONICAL.map((item) => item.id));
    expect(new Set(seen).size).toBe(CANONICAL.length);
  });

  it('breaks ties on the id so equal sort keys keep a stable order', () => {
    const sameInstant: Offer[] = [
      { id: 'y', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'x', createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    const first = paginate(sameInstant, { limit: 1 }, OPTIONS);
    expect(first.items.map((item) => item.id)).toEqual(['y']);
    const second = paginate(
      sameInstant,
      { limit: 1, cursor: first.nextCursor as string },
      OPTIONS,
    );
    expect(second.items.map((item) => item.id)).toEqual(['x']);
    expect(second.nextCursor).toBeNull();
  });

  it('round-trips a cursor through the codec', () => {
    const payload = { k: '2026-01-01T00:00:00.000Z', i: 'a' };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('rejects a tampered cursor with the coded error', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(ApplicationError);

    try {
      decodeCursor('not-a-cursor');
      throw new Error('decodeCursor should have rejected the cursor');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe(
        ApiErrorCode.INVALID_CURSOR,
      );
    }
  });

  it('still rejects a malformed or tampered cursor through paginate', () => {
    // A well-formed cursor now names a position, so the only cursors that are
    // rejected are the ones that are not cursors at all: a malformed string or a
    // payload of the wrong shape. That behaviour is not lost.
    expect(() =>
      paginate(UNSORTED, { cursor: 'not-a-cursor' }, OPTIONS),
    ).toThrow(ApplicationError);

    const wrongShape = Buffer.from('{"k":1,"i":"zz"}', 'utf8').toString(
      'base64url',
    );
    expect(() => paginate(UNSORTED, { cursor: wrongShape }, OPTIONS)).toThrow(
      ApplicationError,
    );
  });

  it('resumes after a cursor whose anchor is no longer in the set', () => {
    // An anchor can vanish between pages: an offer is hidden at zero
    // availability, or it expires. The cursor names a *position*, so the
    // following page must still resolve instead of answering INVALID_CURSOR.
    const first = paginate(UNSORTED, { limit: 2 }, OPTIONS);
    expect(first.items.map((item) => item.id)).toEqual(['e', 'd']);

    const withoutAnchor = UNSORTED.filter((item) => item.id !== 'd');
    const second = paginate(
      withoutAnchor,
      { limit: 2, cursor: first.nextCursor as string },
      OPTIONS,
    );

    expect(second.items.map((item) => item.id)).toEqual(['c', 'b']);
  });
});
