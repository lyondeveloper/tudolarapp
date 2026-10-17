import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApplicationError } from './application-error';
import { ApiErrorCode } from './api-error-code';
import { ERROR_CATALOG } from './error-catalog';
import { resolveRequestId, toErrorEnvelope } from './error-envelope';

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [HttpStatus.METHOD_NOT_ALLOWED]: ApiErrorCode.METHOD_NOT_ALLOWED,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ApiErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ApiErrorCode.UNSUPPORTED_MEDIA_TYPE,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ApiErrorCode.INTERNAL_ERROR,
};

/** The first status that is a server failure rather than a client one. */
const SERVER_ERROR_STATUS = 500;

interface DescribedError {
  code: ApiErrorCode;
  details?: unknown[];
}

/**
 * The one filter for errors that are not already an `HttpException`: the
 * application errors a use case throws and Nest's own transport errors,
 * including a `ValidationPipe` rejection.
 *
 * Its `@Catch` list is deliberately disjoint from the auth filter's
 * (`@Catch(AuthApplicationError)`), so exactly one filter matches each
 * exception and the order they are registered in never changes the answer.
 * Both answer with the same envelope.
 */
@Catch(HttpException, ApplicationError)
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(
    exception: HttpException | ApplicationError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const described = this.describe(exception);
    const descriptor = ERROR_CATALOG[described.code];

    response.status(descriptor.status).json(
      toErrorEnvelope({
        code: described.code,
        message: descriptor.message,
        requestId: resolveRequestId(request),
        details: described.details,
      }),
    );
  }

  private describe(
    exception: HttpException | ApplicationError,
  ): DescribedError {
    if (exception instanceof ApplicationError) {
      return { code: exception.code, details: exception.details };
    }

    const status = exception.getStatus();
    const details = validationDetails(exception);
    if (details) {
      return { code: ApiErrorCode.VALIDATION_FAILED, details };
    }

    if (status >= SERVER_ERROR_STATUS) {
      this.logger.error(
        `Unhandled HTTP exception (${status}): ${exception.message}`,
        exception.stack,
      );
    }

    const code =
      CODE_BY_STATUS[status] ??
      (status >= SERVER_ERROR_STATUS
        ? ApiErrorCode.INTERNAL_ERROR
        : ApiErrorCode.BAD_REQUEST);

    return { code };
  }
}

/**
 * `ValidationPipe` answers a `BadRequestException` whose payload carries the
 * constraint failures as a `message` array. That array is the only detail the
 * envelope exposes; the raw payload never reaches the client.
 */
function validationDetails(exception: HttpException): unknown[] | undefined {
  const payload = exception.getResponse();
  if (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as { message?: unknown }).message)
  ) {
    return (payload as { message: unknown[] }).message;
  }
  return undefined;
}
