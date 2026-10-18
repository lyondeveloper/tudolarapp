import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { ApiErrorCode } from './api-error-code';

/**
 * The single error shape every failure answers with. `code` comes from the
 * closed `ApiErrorCode` enum so a client can branch on it; `message` is safe to
 * show and never carries SQL, a stack trace, or personal data.
 */
export interface ErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown[];
  };
  requestId: string;
}

export const REQUEST_ID_HEADER = 'x-request-id';

interface ErrorEnvelopeInput {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  details?: unknown[];
}

export function toErrorEnvelope(input: ErrorEnvelopeInput): ErrorEnvelope {
  const error: ErrorEnvelope['error'] = {
    code: input.code,
    message: input.message,
  };
  if (input.details !== undefined) {
    error.details = input.details;
  }
  return { error, requestId: input.requestId };
}

/**
 * The request id travels with the envelope so a client can quote it and an
 * operator can correlate it with the logs. A middleware assigns it from the
 * incoming `X-Request-Id`; when the middleware is absent the filter falls back
 * to the header and then to a fresh id, so the envelope is always complete.
 */
export function resolveRequestId(request: Request): string {
  const assigned = (request as Request & { requestId?: unknown }).requestId;
  if (typeof assigned === 'string' && assigned.length > 0) {
    return assigned;
  }

  const header = request.headers[REQUEST_ID_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return randomUUID();
}
