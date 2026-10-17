/* eslint-disable @typescript-eslint/no-require-imports */
const { worktreeDatabaseName } = require('./worktree-database.cjs');

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
      expect({ dir, name: worktreeDatabaseName(dir) }).toEqual({
        dir,
        name: expect.stringMatching(/^[a-z_][a-z0-9_]*$/),
      });
    }
  });

  it('is not so long that PostgreSQL truncates it', () => {
    const long = `/Users/someone/projects/${'x'.repeat(120)}`;
    expect(worktreeDatabaseName(long).length).toBeLessThanOrEqual(63);
  });
});
