import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';
import { Money } from './../../src/catalog/money';
import { applyMaterialEdit } from './../../src/offers/domain/offer-terms-version';
import type {
  MaterialTermsEdit,
  Offer,
  OfferTermsVersion,
} from './../../src/offers/domain/offer-terms-version';

// ADR-0010 B1 bounds margin to `0 <= margin < 100`. The column is
// `margin_pct NUMERIC(5, 2)`, so the domain rejects over-precision before a
// value can reach Postgres — where `'99.999'` would be rounded up to `100.00`
// and silently break the bound. This scenario stores the largest value the
// domain accepts and reads it back, proving the bound holds after storage.
describe('offer terms decimal scale (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores a domain-accepted margin exactly, so the < 100 bound holds', async () => {
    const offerId = randomUUID();
    const current: OfferTermsVersion = {
      id: randomUUID(),
      offerId,
      version: 1,
      pairId: 'VES_USDT',
      giveAmount: Money.of('1000.00', 'VES'),
      receiveAmount: Money.of('1.000000', 'USDT'),
      rate: '0.00100000',
      marginPct: '1.00',
      minAmount: Money.of('10.00', 'VES'),
      maxAmount: Money.of('100000.00', 'VES'),
      expiresAt: new Date('2026-11-01T00:00:00.000Z'),
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    const offer: Offer = {
      id: offerId,
      marketId: randomUUID(),
      sellerId: randomUUID(),
      status: 'active',
      description: 'A seller offer',
      details: null,
      currentTermsVersionId: current.id,
      initialAmount: Money.of('100000.00', 'VES'),
      reservedAmount: Money.of('0.00', 'VES'),
      completedAmount: Money.of('0.00', 'VES'),
    };
    const edit: MaterialTermsEdit = {
      pairId: 'VES_USDT',
      giveAmount: Money.of('2000.00', 'VES'),
      receiveAmount: Money.of('2.000000', 'USDT'),
      rate: '0.00100000',
      marginPct: '99.99',
      minAmount: Money.of('20.00', 'VES'),
      maxAmount: Money.of('200000.00', 'VES'),
      expiresAt: new Date('2026-11-15T00:00:00.000Z'),
    };

    const { version } = applyMaterialEdit(offer, current, edit, {
      id: randomUUID(),
      now: new Date(),
    });

    await prisma.$executeRaw`
      INSERT INTO "offer_terms_versions"
        ("id", "offer_id", "version", "pair_id", "give_amount", "receive_amount",
         "rate", "margin_pct", "min_amount", "max_amount", "expires_at")
      VALUES (
        ${version.id}::uuid, ${version.offerId}::uuid, ${version.version},
        ${version.pairId},
        ${version.giveAmount.toDecimalString()}::numeric,
        ${version.receiveAmount.toDecimalString()}::numeric,
        ${version.rate}::numeric, ${version.marginPct}::numeric,
        ${version.minAmount.toDecimalString()}::numeric,
        ${version.maxAmount.toDecimalString()}::numeric,
        ${version.expiresAt}
      )
    `;

    const rows = await prisma.$queryRaw<Array<{ margin_pct: string }>>`
      SELECT "margin_pct"::text AS margin_pct
      FROM "offer_terms_versions"
      WHERE "id" = ${version.id}::uuid
    `;

    expect(rows).toHaveLength(1);
    // The stored value is the value the seller set — not a rounded one.
    expect(rows[0].margin_pct).toBe('99.99');
    expect(Number(rows[0].margin_pct)).toBeLessThan(100);
  });
});
