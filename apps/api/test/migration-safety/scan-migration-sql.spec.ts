/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Finding {
  statement: string;
  line: number;
}
interface Scanner {
  scanMigrationSql: (sql: string) => Finding[];
  scanMigrationDirectory: (
    migrationsDir: string,
    allowlist: Record<string, { reason: string }>,
  ) => { migration: string; statement: string; line: number }[];
  loadAllowlist: () => Record<string, { reason: string }>;
}
const scanner = require('./scan-migration-sql.cjs') as Scanner;

/**
 * "No unapproved destructive changes" is a T03 requirement. The scanner is a
 * text guard rail beside review: it errs toward false positives, and the
 * reviewed allowlist (with a mandatory reason) resolves them.
 */
describe('scanMigrationSql', () => {
  it.each([
    ['DROP TABLE', 'DROP TABLE "users";'],
    ['DROP COLUMN', 'ALTER TABLE "users" DROP COLUMN "email";'],
    ['TRUNCATE', 'TRUNCATE TABLE "auth_sessions";'],
    [
      'a data-losing type change',
      'ALTER TABLE "users" ALTER COLUMN "display_name" TYPE VARCHAR(10);',
    ],
  ])('flags %s with its line number', (_label, statement) => {
    const findings = scanner.scanMigrationSql(
      `-- header\nCREATE TABLE "x" ("id" INT);\n${statement}\n`,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
  });

  it('does not flag additive statements', () => {
    expect(
      scanner.scanMigrationSql(
        'ALTER TABLE "users" ADD COLUMN "x" TEXT;\nCREATE INDEX "i" ON "users"("x");',
      ),
    ).toEqual([]);
  });

  it('ignores destructive words inside comments', () => {
    expect(
      scanner.scanMigrationSql('-- never DROP TABLE here\nSELECT 1;'),
    ).toEqual([]);
  });
});

describe('scanMigrationDirectory', () => {
  const migrationsDir = path.join(__dirname, '../../prisma/migrations');

  it('requires a reason on every allowlist entry', () => {
    for (const [name, entry] of Object.entries(scanner.loadAllowlist())) {
      expect({ name, reason: entry.reason }).toEqual({
        name,
        reason: expect.stringMatching(/\S{10,}/) as string,
      });
    }
  });

  it('names the migration, statement, and line of an unapproved finding', () => {
    const tmp = fs.mkdtempSync(path.join(__dirname, 'fixture-'));
    try {
      fs.mkdirSync(path.join(tmp, '20990101000000_bad'));
      fs.writeFileSync(
        path.join(tmp, '20990101000000_bad', 'migration.sql'),
        'SELECT 1;\nALTER TABLE "users" DROP COLUMN "email";\n',
      );

      const findings = scanner.scanMigrationDirectory(tmp, {});

      expect(findings).toEqual([
        expect.objectContaining({ migration: '20990101000000_bad', line: 2 }),
      ]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('accepts a destructive migration that is allowlisted with a reason', () => {
    const tmp = fs.mkdtempSync(path.join(__dirname, 'fixture-'));
    try {
      fs.mkdirSync(path.join(tmp, '20990101000000_bad'));
      fs.writeFileSync(
        path.join(tmp, '20990101000000_bad', 'migration.sql'),
        'DROP TABLE "legacy";\n',
      );

      expect(
        scanner.scanMigrationDirectory(tmp, {
          '20990101000000_bad': { reason: 'Removes an empty legacy table.' },
        }),
      ).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('passes on the current migration history', () => {
    expect(
      scanner.scanMigrationDirectory(migrationsDir, scanner.loadAllowlist()),
    ).toEqual([]);
  });
});
