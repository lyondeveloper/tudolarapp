import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AuthApplicationError,
  AuthApplicationErrorCode,
} from '../../../application/auth.errors';

const responses: Record<
  AuthApplicationErrorCode,
  { status: number; message: string }
> = {
  INVALID_CREDENTIALS: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid credentials',
  },
  INVALID_REFRESH_TOKEN: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid refresh token',
  },
  INVALID_EMAIL_ACTION: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid or expired action token',
  },
  EMAIL_DELIVERY_UNAVAILABLE: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Email delivery is unavailable',
  },
  SMS_DELIVERY_UNAVAILABLE: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'SMS delivery is unavailable',
  },
  INVALID_PASSKEY_CHALLENGE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid or expired passkey challenge',
  },
  INVALID_PASSKEY_RESPONSE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Passkey verification failed',
  },
  INVALID_PHONE_CHALLENGE: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid or expired phone verification code',
  },
  USER_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    message: 'User not found',
  },
  AUTH_METHOD_UNAVAILABLE: {
    status: HttpStatus.CONFLICT,
    message: 'Authentication method is unavailable',
  },
};

@Catch(AuthApplicationError)
export class AuthApplicationErrorFilter implements ExceptionFilter {
  catch(exception: AuthApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = responses[exception.code];
    response
      .status(body.status)
      .json({ statusCode: body.status, message: body.message });
  }
}
