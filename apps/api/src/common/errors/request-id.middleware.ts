import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './error-envelope';

/**
 * Assigns a request id to every request, reusing the caller's `X-Request-Id`
 * when present, so logs and the error envelope agree on the same id.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    const header = request.headers[REQUEST_ID_HEADER];
    const value = Array.isArray(header) ? header[0] : header;
    (request as Request & { requestId?: string }).requestId =
      typeof value === 'string' && value.length > 0 ? value : randomUUID();
    next();
  }
}
