import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENTITLEMENT_PORT } from './application/subscriptions.ports';
import type { EntitlementPort } from './application/subscriptions.ports';
import {
  TemporaryEntitlementAdapter,
  TestEntitlementAdapter,
} from './adapters/out/entitlement.adapter';

/**
 * The subscriptions module. It owns the entitlement **port only** (ADR-0014):
 * the MVP builds no billing, so this is the whole subscription surface.
 *
 * The adapter is selected from `ENTITLEMENT_MODE`. The test adapter is refused
 * outside `NODE_ENV=test` by `config/env.validation.ts`, so selecting it in
 * production fails at startup rather than serving. The port is exported so the
 * offers publish gate can compose it with seller eligibility (ADR-0006).
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ENTITLEMENT_PORT,
      useFactory: (config: ConfigService): EntitlementPort =>
        config.get('ENTITLEMENT_MODE') === 'test'
          ? new TestEntitlementAdapter()
          : new TemporaryEntitlementAdapter(),
      inject: [ConfigService],
    },
  ],
  exports: [ENTITLEMENT_PORT],
})
export class SubscriptionsModule {}
