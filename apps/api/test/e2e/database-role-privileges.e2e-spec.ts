import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Prisma } from './../../src/generated/prisma/client';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';

interface RuntimeRolePrivileges {
  isSuperuser: boolean;
  canCreateDatabase: boolean;
  canCreateRole: boolean;
  canBypassRowLevelSecurity: boolean;
  ownsDatabase: boolean;
  ownsPublicSchema: boolean;
  canCreateInPublic: boolean;
  canCreateInCurrentDatabase: boolean;
  canTruncateTerms: boolean;
}

describe('database runtime role privileges (e2e)', () => {
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

  it('is not a database or schema administrator', async () => {
    const rows = await prisma.$queryRaw<RuntimeRolePrivileges[]>`
      SELECT role.rolsuper AS "isSuperuser",
             role.rolcreatedb AS "canCreateDatabase",
             role.rolcreaterole AS "canCreateRole",
             role.rolbypassrls AS "canBypassRowLevelSecurity",
             EXISTS (
               SELECT 1 FROM pg_database database_row
               WHERE database_row.datname = current_database()
                 AND database_row.datdba = role.oid
             ) AS "ownsDatabase",
             EXISTS (
               SELECT 1 FROM pg_namespace schema_row
               WHERE schema_row.nspname = 'public'
                 AND schema_row.nspowner = role.oid
             ) AS "ownsPublicSchema",
             has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreateInPublic",
             has_database_privilege(current_user, current_database(), 'CREATE') AS "canCreateInCurrentDatabase",
             has_table_privilege(current_user, 'offer_terms_versions', 'TRUNCATE') AS "canTruncateTerms"
      FROM pg_roles role
      WHERE role.rolname = current_user
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      isSuperuser: false,
      canCreateDatabase: false,
      canCreateRole: false,
      canBypassRowLevelSecurity: false,
      ownsDatabase: false,
      ownsPublicSchema: false,
      canCreateInPublic: false,
      canCreateInCurrentDatabase: false,
      canTruncateTerms: false,
    });
  });

  it('cannot truncate offer terms and leaves existing rows intact', async () => {
    const id = randomUUID();
    await prisma.offerTermsVersion.create({
      data: {
        id,
        offerId: randomUUID(),
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

    let truncateWasDenied = false;
    let truncateSucceeded = false;
    try {
      await prisma.$transaction(async (transaction) => {
        try {
          await transaction.$executeRaw`TRUNCATE TABLE "offer_terms_versions"`;
          truncateSucceeded = true;
        } catch {
          truncateWasDenied = true;
          throw new Error('runtime role cannot truncate offer terms');
        }

        throw new Error('rollback successful TRUNCATE probe');
      });
    } catch {
      // The transaction rolls back whether privilege denied TRUNCATE or not.
    }

    expect(truncateWasDenied).toBe(true);
    expect(truncateSucceeded).toBe(false);
    expect(
      await prisma.offerTermsVersion.findUnique({ where: { id } }),
    ).not.toBeNull();
  });
});
