/**
 * The closed set of error codes the API may answer with, so a client can branch
 * on `error.code` instead of matching human-readable text.
 *
 * The enum is the contract: adding a code is additive, and no response may carry
 * a code outside it. The auth codes mirror `AuthApplicationErrorCode` so the
 * existing auth errors keep their identity once they travel in the envelope.
 */
export enum ApiErrorCode {
  // Authentication and account (the codes the auth module already implies).
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  INVALID_EMAIL_ACTION = 'INVALID_EMAIL_ACTION',
  EMAIL_DELIVERY_UNAVAILABLE = 'EMAIL_DELIVERY_UNAVAILABLE',
  SMS_DELIVERY_UNAVAILABLE = 'SMS_DELIVERY_UNAVAILABLE',
  INVALID_PASSKEY_CHALLENGE = 'INVALID_PASSKEY_CHALLENGE',
  INVALID_PASSKEY_RESPONSE = 'INVALID_PASSKEY_RESPONSE',
  INVALID_PHONE_CHALLENGE = 'INVALID_PHONE_CHALLENGE',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  AUTH_METHOD_UNAVAILABLE = 'AUTH_METHOD_UNAVAILABLE',

  // Request validation.
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Market context (`X-Market-Id`).
  MARKET_ID_REQUIRED = 'MARKET_ID_REQUIRED',
  MARKET_NOT_FOUND = 'MARKET_NOT_FOUND',

  // Cursor pagination.
  INVALID_CURSOR = 'INVALID_CURSOR',

  // Generic transport errors mapped from Nest's own exceptions.
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server.
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

const API_ERROR_CODE_VALUES = new Set<string>(Object.values(ApiErrorCode));

/** Narrows an untrusted value to a code from the closed enum. */
export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && API_ERROR_CODE_VALUES.has(value);
}
