import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { HealthStatus } from './app.service';
import { Public } from './auth/adapters/in/http/auth.decorators';

@Public()
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealthStatus(): HealthStatus {
    return this.appService.getHealthStatus();
  }
}
