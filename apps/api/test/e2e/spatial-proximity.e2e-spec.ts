import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from './../../src/generated/prisma/client';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';
import {
  createSpatialAllowlist,
  kilometresToMeters,
  proximityFilter,
} from './../../src/database/spatial/proximity-filter';

interface ProbeRow {
  id: string;
}

describe('spatial proximity filter (e2e)', () => {
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

  it('executes ST_DWithin against a temporary geography(Point,4326) table inside a rolled-back transaction and leaves no table behind', async () => {
    const allowlist = createSpatialAllowlist([
      { table: 'spatial_probe_points', geographyColumn: 'location' },
    ]);

    const predicate = proximityFilter(
      {
        table: 'spatial_probe_points',
        geographyColumn: 'location',
        // Ciudad Ojeda center reference coordinates
        longitude: -71.3081,
        latitude: 10.1969,
        radiusMeters: kilometresToMeters(5),
        maxRadiusMeters: kilometresToMeters(50),
      },
      allowlist,
    );

    let matchedIds: string[] = [];

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          CREATE TEMP TABLE "spatial_probe_points" (
            "id" TEXT PRIMARY KEY,
            "location" geography(Point, 4326) NOT NULL
          ) ON COMMIT DROP
        `;

        // ~1.1 km away (inside 5 km radius) and ~25 km away (outside 5 km radius)
        await tx.$executeRaw`
          INSERT INTO "spatial_probe_points" ("id", "location") VALUES
            ('near-point', ST_SetSRID(ST_MakePoint(-71.3081, 10.2069), 4326)::geography),
            ('far-point', ST_SetSRID(ST_MakePoint(-71.5000, 10.3500), 4326)::geography)
        `;

        const rows = await tx.$queryRaw<ProbeRow[]>(
          Prisma.sql`SELECT "id" FROM "spatial_probe_points" WHERE ${predicate} ORDER BY "id"`,
        );
        matchedIds = rows.map((r) => r.id);

        throw new Error('rollback spatial probe transaction');
      }),
    ).rejects.toThrow('rollback spatial probe transaction');

    expect(matchedIds).toEqual(['near-point']);

    const leftover = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT to_regclass('spatial_probe_points') IS NOT NULL AS "exists"
    `;
    expect(leftover[0]?.exists).toBe(false);
  });
});
