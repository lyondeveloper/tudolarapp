import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';

/**
 * What a cursor carries: the stable sort key of the last item on a page and the
 * tie-breaking id. It is the server's private representation, so it is encoded
 * into an opaque string before it travels.
 */
export interface CursorPayload {
  /** The stable sort key of the last item on the page. */
  k: string;
  /** The tie-breaking id of that item. */
  i: string;
}

/**
 * Cursors are opaque to the client: base64url hides the payload so a client
 * treats it as a token it must hand back, never parse or build. The payload is
 * still re-validated on the way in, so a tampered cursor is a coded `400`
 * rather than a crash or a silently different page.
 */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new ApplicationError(ApiErrorCode.INVALID_CURSOR);
  }

  if (!isCursorPayload(parsed)) {
    throw new ApplicationError(ApiErrorCode.INVALID_CURSOR);
  }

  return parsed;
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { k?: unknown; i?: unknown };
  return typeof candidate.k === 'string' && typeof candidate.i === 'string';
}
