import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from './api-error-code';

export interface ErrorDescriptor {
  /** The HTTP status the code answers with. */
  status: number;
  /**
   * The human-readable, non-leaking message. It never carries SQL, a stack
   * trace, or personal data; the specific cause is logged, not returned.
   */
  message: string;
}

/**
 * The single mapping from an error code to its status and message. Every
 * producer of the envelope reads it, so a code answers the same way regardless
 * of which filter caught it.
 */
export const ERROR_CATALOG: Record<ApiErrorCode, ErrorDescriptor> = {
  [ApiErrorCode.INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid credentials',
  },
  [ApiErrorCode.INVALID_REFRESH_TOKEN]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid refresh token',
  },
  [ApiErrorCode.INVALID_EMAIL_ACTION]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid or expired action token',
  },
  [ApiErrorCode.EMAIL_DELIVERY_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Email delivery is unavailable',
  },
  [ApiErrorCode.SMS_DELIVERY_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'SMS delivery is unavailable',
  },
  [ApiErrorCode.INVALID_PASSKEY_CHALLENGE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid or expired passkey challenge',
  },
  [ApiErrorCode.INVALID_PASSKEY_RESPONSE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Passkey verification failed',
  },
  [ApiErrorCode.INVALID_PHONE_CHALLENGE]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid or expired phone verification code',
  },
  [ApiErrorCode.USER_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'User not found',
  },
  [ApiErrorCode.AUTH_METHOD_UNAVAILABLE]: {
    status: HttpStatus.CONFLICT,
    message: 'Authentication method is unavailable',
  },
  [ApiErrorCode.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Request validation failed',
  },
  [ApiErrorCode.MARKET_ID_REQUIRED]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'The X-Market-Id header is required',
  },
  [ApiErrorCode.MARKET_NOT_FOUND]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Unknown market',
  },
  [ApiErrorCode.INVALID_CURSOR]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid pagination cursor',
  },
  [ApiErrorCode.BAD_REQUEST]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Bad request',
  },
  [ApiErrorCode.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Authentication is required',
  },
  [ApiErrorCode.FORBIDDEN]: {
    status: HttpStatus.FORBIDDEN,
    message: 'Forbidden',
  },
  [ApiErrorCode.NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Resource not found',
  },
  [ApiErrorCode.METHOD_NOT_ALLOWED]: {
    status: HttpStatus.METHOD_NOT_ALLOWED,
    message: 'Method not allowed',
  },
  [ApiErrorCode.CONFLICT]: {
    status: HttpStatus.CONFLICT,
    message: 'Conflict',
  },
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    message: 'Payload too large',
  },
  [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE]: {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    message: 'Unsupported media type',
  },
  [ApiErrorCode.TOO_MANY_REQUESTS]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests',
  },
  [ApiErrorCode.INTERNAL_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },
};
