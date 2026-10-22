import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';

interface TermsInsert {
  version: number;
  pairId: string;
  giveAmount: string;
  receiveAmount: string;
  rate: string | null;
  marginPct: string;
  minAmount: string;
  maxAmount: string;
  expiresAt: Date;
}

const validTerms: TermsInsert = {
  version: 1,
  pairId: 'VES_USDT',
  giveAmount: '1000.00',
  receiveAmount: '1.000000',
  rate: '0.00100000',
  marginPct: '1.00',
  minAmount: '10.00',
  maxAmount: '100000.00',
  expiresAt: new Date('2026-10-25T00:00:00.000Z'),
};

const TABLE = 'offer_terms_versions';
const TERMS_CHECK_CONSTRAINTS = [
  'offer_terms_versions_amount_range_check',
  'offer_terms_versions_give_amount_positive_check',
  'offer_terms_versions_margin_pct_check',
  'offer_terms_versions_max_amount_positive_check',
  'offer_terms_versions_min_amount_positive_check',
  'offer_terms_versions_pair_id_check',
  'offer_terms_versions_rate_pair_check',
  'offer_terms_versions_receive_amount_positive_check',
  'offer_terms_versions_version_positive_check',
];

describe('offer terms version database invariants (e2e)', () => {
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

  it('installs all offer-terms check constraints in PostgreSQL', async () => {
    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT constraint_row.conname
      FROM pg_constraint constraint_row
      JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
      JOIN pg_namespace schema_row ON schema_row.oid = table_row.relnamespace
      WHERE table_row.relname = ${TABLE}
        AND schema_row.nspname = current_schema()
        AND constraint_row.contype = 'c'
      ORDER BY constraint_row.conname
    `;

    expect(rows.map((row) => row.conname)).toEqual(TERMS_CHECK_CONSTRAINTS);
  });

  async function insertTerms(
    overrides: Partial<TermsInsert> = {},
  ): Promise<void> {
    const terms = { ...validTerms, ...overrides };

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO "offer_terms_versions"
          ("id", "offer_id", "version", "pair_id", "give_amount", "receive_amount",
           "rate", "margin_pct", "min_amount", "max_amount", "expires_at")
        VALUES (
          ${randomUUID()}::uuid, ${randomUUID()}::uuid, ${terms.version},
          ${terms.pairId}, ${terms.giveAmount}::numeric, ${terms.receiveAmount}::numeric,
          ${terms.rate}::numeric, ${terms.marginPct}::numeric, ${terms.minAmount}::numeric,
          ${terms.maxAmount}::numeric, ${terms.expiresAt}
        )
      `;
      throw new Error(
        'invalid terms row unexpectedly passed its database checks',
      );
    });
  }

  async function expectCheckViolation(
    overrides: Partial<TermsInsert>,
  ): Promise<void> {
    let failure: unknown;
    try {
      await insertTerms(overrides);
    } catch (error) {
      failure = error;
    }

    const prismaFailure = failure as {
      meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
    };
    expect(failure).toBeDefined();
    expect(prismaFailure.meta?.driverAdapterError?.cause?.originalCode).toBe(
      '23514',
    );
  }

  it('rejects a pair id outside the closed catalog', async () => {
    await expectCheckViolation({ pairId: 'NOT_A_PAIR' });
  });

  it('rejects nonpositive give and receive amounts', async () => {
    await expectCheckViolation({ giveAmount: '0.00' });
    await expectCheckViolation({ receiveAmount: '-1.000000' });
  });

  it('rejects invalid per-offer limits', async () => {
    await expectCheckViolation({ minAmount: '0.00' });
    await expectCheckViolation({ minAmount: '20.00', maxAmount: '10.00' });
  });

  it('rejects margins outside the seller contract', async () => {
    await expectCheckViolation({ marginPct: '-0.01' });
    await expectCheckViolation({ marginPct: '100.00' });
  });

  it('rejects a conversion pair without a positive rate', async () => {
    await expectCheckViolation({ rate: null });
    await expectCheckViolation({ rate: '0.00000000' });
  });

  it('rejects a rate on the same-asset pair', async () => {
    await expectCheckViolation({
      pairId: 'VES_BANK_TO_VES_CASH',
      rate: '1.00000000',
    });
  });

  it('rejects a version less than one', async () => {
    await expectCheckViolation({ version: 0 });
  });
});
