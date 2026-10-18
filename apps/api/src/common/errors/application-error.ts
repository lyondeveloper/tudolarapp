import { ApiErrorCode } from './api-error-code';
import { ERROR_CATALOG } from './error-catalog';

/**
 * The error a use case throws to answer with the shared envelope. It carries a
 * code from the closed enum and an optional `details` list, and its message is
 * the catalog's safe message — never the raw cause.
 */
export class ApplicationError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown[];

  constructor(code: ApiErrorCode, details?: unknown[]) {
    super(ERROR_CATALOG[code].message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
  }
}
