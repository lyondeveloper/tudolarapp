import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';

// ADR-0001 and design.md: version rows are insert-only, and the rule is enforced
// by the database itself — a trigger written as hand-written SQL in a
// `--create-only` migration — not by application discipline. This is the same
// class of unmodelled object as the CHECK constraints in the identity migration.
const TABLE = 'offer_terms_versions';
const UPDATE_TRIGGER = 'offer_terms_versions_no_update';

interface TriggerRow {
  tgname: string;
}

interface OfferTermsVersionDelegate {
  create(args: {
    data: {
      id: string;
      offerId: string;
      version: number;
      pairId: string;
      giveAmount: string;
      receiveAmount: string;
      rate: string | null;
      marginPct: string;
      minAmount: string;
      maxAmount: string;
      expiresAt: Date;
    };
  }): Promise<{ id: string }>;
  findUnique(args: { where: { id: string } }): Promise<{
    id: string;
    pairId: string;
    version: number;
  } | null>;
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

  it('reads the existing terms-version table through the generated Prisma model', async () => {
    const termsVersion = (
      prisma as unknown as {
        offerTermsVersion?: OfferTermsVersionDelegate;
      }
    ).offerTermsVersion;
    expect(termsVersion).toBeDefined();
    if (!termsVersion) return;

    const id = randomUUID();
    await termsVersion.create({
      data: {
        id,
        offerId: randomUUID(),
        version: 1,
        pairId: 'VES_USDT',
        giveAmount: '1000.00',
        receiveAmount: '1.000000',
        rate: '0.00100000',
        marginPct: '1.00',
        minAmount: '1.00',
        maxAmount: '1000.00',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await expect(
      termsVersion.findUnique({ where: { id } }),
    ).resolves.toMatchObject({ id, pairId: 'VES_USDT', version: 1 });
  });

  it('rejects an UPDATE to a version row with a database trigger', async () => {
    // The enforcement must come from the database object the migration adds,
    // not from anything the application chooses to do.
    expect(await installedTriggers()).toContain(UPDATE_TRIGGER);

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

    let failure: unknown;
    try {
      await prisma.$executeRaw`
        UPDATE "offer_terms_versions"
        SET "give_amount" = 999
        WHERE "id" = ${versionId}::uuid
      `;
    } catch (error) {
      failure = error;
    }

    // Prisma wraps driver errors; assert the Postgres SQLSTATE the trigger
    // raises (23514, check_violation) rather than Prisma's own error code.
    const prismaFailure = failure as {
      meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
    };
    expect(failure).toBeDefined();
    expect(prismaFailure.meta?.driverAdapterError?.cause?.originalCode).toBe(
      '23514',
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
});
