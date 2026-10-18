import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ENTITLEMENT_PORT } from '../../application/subscriptions.ports';
import type { EntitlementPort } from '../../application/subscriptions.ports';
import { SubscriptionsModule } from '../../subscriptions.module';
import {
  TemporaryEntitlementAdapter,
  TestEntitlementAdapter,
} from './entitlement.adapter';

// ADR-0014: the entitlement port is the only subscription surface, and the test
// adapter is selected only when ENTITLEMENT_MODE=test (which env.validation
// refuses outside NODE_ENV=test).

describe('the entitlement adapters', () => {
  it('temporary adapter returns the MVP entitled result (ADR-0014)', async () => {
    const entitlement =
      await new TemporaryEntitlementAdapter().resolveEntitlement('seller-1');
    expect(entitlement).toEqual({
      sellerId: 'seller-1',
      entitled: true,
      source: 'temporary',
    });
  });

  it('test adapter returns the test entitled result', async () => {
    const entitlement = await new TestEntitlementAdapter().resolveEntitlement(
      'seller-1',
    );
    expect(entitlement).toEqual({
      sellerId: 'seller-1',
      entitled: true,
      source: 'test',
    });
  });
});

describe('the subscriptions module', () => {
  async function resolveEntitlement(mode: string): Promise<EntitlementPort> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ ENTITLEMENT_MODE: mode })],
        }),
        SubscriptionsModule,
      ],
    }).compile();
    return moduleRef.get<EntitlementPort>(ENTITLEMENT_PORT);
  }

  it('selects the test adapter when ENTITLEMENT_MODE=test', async () => {
    expect(await resolveEntitlement('test')).toBeInstanceOf(
      TestEntitlementAdapter,
    );
  });

  it('selects the temporary adapter by default', async () => {
    expect(await resolveEntitlement('temporary')).toBeInstanceOf(
      TemporaryEntitlementAdapter,
    );
  });
});
