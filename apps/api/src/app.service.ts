import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
}

@Injectable()
export class AppService {
  getHealthStatus(): HealthStatus {
    return { status: 'ok' };
  }
}
