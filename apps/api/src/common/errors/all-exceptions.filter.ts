import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorCode, isApiErrorCode } from './api-error-code';
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
  /** The status the response answers with. */
  status: number;
  details?: unknown[];
}

/**
 * The one filter for every failure, so a client always reads the shared
 * envelope and no module can answer in Nest's default shape.
 *
 * It resolves the answer in this order:
 *  - an `HttpException` (Nest's own transport errors and a `ValidationPipe`
 *    rejection): the status mapped through the existing table, keeping the
 *    exception's own status so a 503 stays 503 and a 422 stays 422;
 *  - any error that carries a `code` from the closed `ApiErrorCode` enum
 *    (`ApplicationError` and the auth module's `AuthApplicationError`): that
 *    code, with the catalog's status and message;
 *  - anything else: `INTERNAL_ERROR`, logged with its stack, answering with the
 *    catalog's safe message rather than the raw error's.
 *
 * Reading the code by shape, rather than by `instanceof`, is what lets the auth
 * error travel through this filter without `common/` importing from `auth/`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const described = this.describe(exception);
    const descriptor = ERROR_CATALOG[described.code];

    response.status(described.status).json(
      toErrorEnvelope({
        code: described.code,
        message: descriptor.message,
        requestId: resolveRequestId(request),
        details: described.details,
      }),
    );
  }

  private describe(exception: unknown): DescribedError {
    if (exception instanceof HttpException) {
      return this.describeHttpException(exception);
    }

    const code = codeOf(exception);
    if (code !== undefined) {
      return {
        code,
        status: ERROR_CATALOG[code].status,
        details: detailsOf(exception),
      };
    }

    this.logger.error(
      `Unhandled exception: ${messageOf(exception)}`,
      stackOf(exception),
    );

    return {
      code: ApiErrorCode.INTERNAL_ERROR,
      status: ERROR_CATALOG[ApiErrorCode.INTERNAL_ERROR].status,
    };
  }

  private describeHttpException(exception: HttpException): DescribedError {
    const status = exception.getStatus();
    const details = validationDetails(exception);
    if (details) {
      return { code: ApiErrorCode.VALIDATION_FAILED, status, details };
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

    return { code, status };
  }
}

/** Reads a code from the closed enum off any error that carries one. */
function codeOf(exception: unknown): ApiErrorCode | undefined {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }
  const code = (exception as { code?: unknown }).code;
  return isApiErrorCode(code) ? code : undefined;
}

/** Reads an optional `details` array off any error that carries one. */
function detailsOf(exception: unknown): unknown[] | undefined {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }
  const details = (exception as { details?: unknown }).details;
  return Array.isArray(details) ? details : undefined;
}

function messageOf(exception: unknown): string {
  return exception instanceof Error ? exception.message : String(exception);
}

function stackOf(exception: unknown): string | undefined {
  return exception instanceof Error ? exception.stack : undefined;
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
