import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorCode } from '../../../../common/errors/api-error-code';
import { ERROR_CATALOG } from '../../../../common/errors/error-catalog';
import {
  resolveRequestId,
  toErrorEnvelope,
} from '../../../../common/errors/error-envelope';
import {
  AuthApplicationError,
  AuthApplicationErrorCode,
} from '../../../application/auth.errors';

/**
 * Maps each auth error to a code from the closed `ApiErrorCode` enum. The
 * status and the human-readable message live in the shared catalog, so an auth
 * error and any other error answer through the same envelope.
 */
const CODES: Record<AuthApplicationErrorCode, ApiErrorCode> = {
  INVALID_CREDENTIALS: ApiErrorCode.INVALID_CREDENTIALS,
  INVALID_REFRESH_TOKEN: ApiErrorCode.INVALID_REFRESH_TOKEN,
  INVALID_EMAIL_ACTION: ApiErrorCode.INVALID_EMAIL_ACTION,
  EMAIL_DELIVERY_UNAVAILABLE: ApiErrorCode.EMAIL_DELIVERY_UNAVAILABLE,
  SMS_DELIVERY_UNAVAILABLE: ApiErrorCode.SMS_DELIVERY_UNAVAILABLE,
  INVALID_PASSKEY_CHALLENGE: ApiErrorCode.INVALID_PASSKEY_CHALLENGE,
  INVALID_PASSKEY_RESPONSE: ApiErrorCode.INVALID_PASSKEY_RESPONSE,
  INVALID_PHONE_CHALLENGE: ApiErrorCode.INVALID_PHONE_CHALLENGE,
  USER_NOT_FOUND: ApiErrorCode.USER_NOT_FOUND,
  AUTH_METHOD_UNAVAILABLE: ApiErrorCode.AUTH_METHOD_UNAVAILABLE,
};

@Catch(AuthApplicationError)
export class AuthApplicationErrorFilter implements ExceptionFilter {
  catch(exception: AuthApplicationError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const code = CODES[exception.code];
    const descriptor = ERROR_CATALOG[code];

    response.status(descriptor.status).json(
      toErrorEnvelope({
        code,
        message: descriptor.message,
        requestId: resolveRequestId(request),
      }),
    );
  }
}
