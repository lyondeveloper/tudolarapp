import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Prisma } from './../../src/generated/prisma/client';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';

// ADR-0001 and design.md: version rows are insert-only, and the rule is enforced
// by the database itself — a trigger written as hand-written SQL in a
// `--create-only` migration — not by application discipline. This is the same
// class of unmodelled object as the CHECK constraints in the identity migration.
const TABLE = 'offer_terms_versions';
const DELETE_TRIGGER = 'offer_terms_versions_no_delete';
const UPDATE_TRIGGER = 'offer_terms_versions_no_update';

interface TriggerRow {
  tgname: string;
}

describe('offer terms version immutability (e2e)', () => {
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

  /**
   * The triggers installed on the version table. An empty list means the
   * migration that creates the table and its trigger has not been applied — the
   * failure the test is written to catch.
   */
  async function installedTriggers(): Promise<string[]> {
    const rows = await prisma.$queryRaw<TriggerRow[]>`
      SELECT t.tgname AS tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = ${TABLE} AND NOT t.tgisinternal
      ORDER BY t.tgname
    `;
    return rows.map((row) => row.tgname);
  }

  async function expectMutationViolation(
    operation: () => Promise<unknown>,
  ): Promise<void> {
    let failure: unknown;
    try {
      await operation();
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

  it('reads the existing terms-version table through the generated Prisma model', async () => {
    const id = randomUUID();
    const offerId = randomUUID();
    await prisma.offerTermsVersion.create({
      data: {
        id,
        offerId,
        version: 1,
        pairId: 'VES_USDT',
        giveAmount: new Prisma.Decimal('1000.00'),
        receiveAmount: new Prisma.Decimal('1.000000'),
        rate: new Prisma.Decimal('0.00100000'),
        marginPct: new Prisma.Decimal('1.00'),
        minAmount: new Prisma.Decimal('1.00'),
        maxAmount: new Prisma.Decimal('1000.00'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const termsVersion = await prisma.offerTermsVersion.findUnique({
      where: { id },
    });
    expect(termsVersion).toMatchObject({
      id,
      offerId,
      pairId: 'VES_USDT',
      version: 1,
    });
    expect(termsVersion?.giveAmount.toFixed(6)).toBe('1000.000000');
    expect(termsVersion?.receiveAmount.toFixed(6)).toBe('1.000000');
    expect(termsVersion?.rate?.toFixed(8)).toBe('0.00100000');
    expect(termsVersion?.marginPct.toFixed(2)).toBe('1.00');
  });

  it('enforces the per-offer version unique index through the generated delegate', async () => {
    const offerId = randomUUID();
    const data = {
      offerId,
      version: 1,
      pairId: 'VES_USDT',
      giveAmount: new Prisma.Decimal('1000.00'),
      receiveAmount: new Prisma.Decimal('1.000000'),
      rate: new Prisma.Decimal('0.00100000'),
      marginPct: new Prisma.Decimal('1.00'),
      minAmount: new Prisma.Decimal('1.00'),
      maxAmount: new Prisma.Decimal('1000.00'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    await prisma.offerTermsVersion.create({
      data: { id: randomUUID(), ...data },
    });
    await expect(
      prisma.offerTermsVersion.create({
        data: { id: randomUUID(), ...data },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects an UPDATE to a version row with a database trigger', async () => {
    // The enforcement must come from the database object the migration adds,
    // not from anything the application chooses to do.
    expect(await installedTriggers()).toEqual([DELETE_TRIGGER, UPDATE_TRIGGER]);

    const offerId = randomUUID();
    const versionId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "offer_terms_versions"
        ("id", "offer_id", "version", "pair_id", "give_amount", "receive_amount",
         "rate", "margin_pct", "min_amount", "max_amount", "expires_at")
      VALUES (
        ${versionId}::uuid, ${offerId}::uuid, 1, 'VES_USDT',
        1000.00, 1.000000, 0.00100000, 1.00, 1.00, 1000000.00,
        now() + interval '7 days'
      )
    `;

    await expectMutationViolation(
      () =>
        prisma.$executeRaw`
        UPDATE "offer_terms_versions"
        SET "give_amount" = 999
        WHERE "id" = ${versionId}::uuid
      `,
    );

    // And the row is untouched.
    const rows = await prisma.$queryRaw<Array<{ give_amount: string }>>`
      SELECT "give_amount"::text AS give_amount
      FROM "offer_terms_versions"
      WHERE "id" = ${versionId}::uuid
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].give_amount).toBe('1000.000000');
  });

  it('rejects a DELETE to a version row with the database trigger', async () => {
    const offerId = randomUUID();
    const versionId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "offer_terms_versions"
        ("id", "offer_id", "version", "pair_id", "give_amount", "receive_amount",
         "rate", "margin_pct", "min_amount", "max_amount", "expires_at")
      VALUES (
        ${versionId}::uuid, ${offerId}::uuid, 1, 'VES_USDT',
        1000.00, 1.000000, 0.00100000, 1.00, 1.00, 1000000.00,
        now() + interval '7 days'
      )
    `;

    await expectMutationViolation(
      () =>
        prisma.$executeRaw`
        DELETE FROM "offer_terms_versions"
        WHERE "id" = ${versionId}::uuid
      `,
    );

    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"::text AS id
      FROM "offer_terms_versions"
      WHERE "id" = ${versionId}::uuid
    `;
    expect(rows).toHaveLength(1);
  });
});
