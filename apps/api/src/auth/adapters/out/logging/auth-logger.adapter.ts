import { Injectable, Logger } from '@nestjs/common';
import type { AuthLoggerPort } from '../../../application/auth.ports';

@Injectable()
export class NestAuthLoggerAdapter implements AuthLoggerPort {
  private readonly logger = new Logger('AuthService');

  reportDeliveryFailure(message: string): void {
    this.logger.error(message);
  }
}
