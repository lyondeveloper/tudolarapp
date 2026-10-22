/* eslint-disable @typescript-eslint/no-require-imports */
const { worktreeDatabaseName } = require('./worktree-database.cjs') as {
  worktreeDatabaseName: (worktreePath: string) => string;
};
const { resolveTestDatabase } = require('./e2e-environment.cjs') as {
  resolveTestDatabase: () => {
    url: string;
    adminUrl?: string;
    migrationUrl?: string;
    derived: boolean;
  };
};

/**
 * Each worktree must get its own disposable database, and the name must satisfy
 * two existing constraints at once: the harness refuses any test database whose
 * name does not end in `_test`, and PostgreSQL treats an unquoted identifier as
 * folded to lower case, so the name has to survive being used unquoted.
 */
describe('worktreeDatabaseName', () => {
  const WORKTREE = '/Users/someone/projects/tudolarapp';

  it('is stable for the same worktree', () => {
    expect(worktreeDatabaseName(WORKTREE)).toBe(worktreeDatabaseName(WORKTREE));
  });

  it('differs between worktrees', () => {
    const primary = worktreeDatabaseName(WORKTREE);
    const spike = worktreeDatabaseName(`${WORKTREE}-sp01`);

    expect(primary).not.toBe(spike);
  });

  it('always ends in _test, so the harness accepts it', () => {
    for (const dir of [WORKTREE, '/a/b-c', '/a/B C', '/a/ñ', '/a/b/c']) {
      expect({ dir, ok: worktreeDatabaseName(dir).endsWith('_test') }).toEqual({
        dir,
        ok: true,
      });
    }
  });

  it('is a valid unquoted PostgreSQL identifier', () => {
    for (const dir of [WORKTREE, '/a/B C', '/a/ñ', '/a/-leading', '/a/UPPER']) {
      expect({
        dir,
        valid: /^[a-z_][a-z0-9_]*$/.test(worktreeDatabaseName(dir)),
      }).toEqual({ dir, valid: true });
    }
  });

  it('is not so long that PostgreSQL truncates it', () => {
    const long = `/Users/someone/projects/${'x'.repeat(120)}`;
    expect(worktreeDatabaseName(long).length).toBeLessThanOrEqual(63);
  });
});

describe('resolveTestDatabase', () => {
  it('keeps runtime and maintenance credentials separate for one worktree DB', () => {
    const original = {
      DATABASE_URL: process.env.DATABASE_URL,
      MIGRATION_DATABASE_URL: process.env.MIGRATION_DATABASE_URL,
      TUDOLAR_TEST_DATABASE_URL: process.env.TUDOLAR_TEST_DATABASE_URL,
    };

    try {
      process.env.DATABASE_URL =
        'postgresql://tudolar_app:app-password@127.0.0.1:5433/tudolar';
      process.env.MIGRATION_DATABASE_URL =
        'postgresql://tudolar:migration-password@127.0.0.1:5433/tudolar';
      delete process.env.TUDOLAR_TEST_DATABASE_URL;

      const resolved = resolveTestDatabase();
      expect(resolved.derived).toBe(true);
      expect(resolved.migrationUrl).toBeDefined();
      expect(new URL(resolved.url).username).toBe('tudolar_app');
      expect(new URL(resolved.migrationUrl ?? '').username).toBe('tudolar');
      expect(new URL(resolved.url).pathname).toBe(
        new URL(resolved.migrationUrl ?? '').pathname,
      );
      expect(new URL(resolved.adminUrl ?? '').username).toBe('tudolar');
    } finally {
      if (original.DATABASE_URL === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = original.DATABASE_URL;
      }
      if (original.MIGRATION_DATABASE_URL === undefined) {
        delete process.env.MIGRATION_DATABASE_URL;
      } else {
        process.env.MIGRATION_DATABASE_URL = original.MIGRATION_DATABASE_URL;
      }
      if (original.TUDOLAR_TEST_DATABASE_URL === undefined) {
        delete process.env.TUDOLAR_TEST_DATABASE_URL;
      } else {
        process.env.TUDOLAR_TEST_DATABASE_URL =
          original.TUDOLAR_TEST_DATABASE_URL;
      }
    }
  });
});
