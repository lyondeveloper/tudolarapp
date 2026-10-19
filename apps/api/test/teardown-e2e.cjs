'use strict';

const { URL } = require('node:url');

const { Client } = require('pg');
const {
  LOCAL_HOSTS,
  repoRoot,
  resolveTestDatabase,
} = require('./e2e-environment.cjs');
const { worktreeDatabaseName } = require('./worktree-database.cjs');

/**
 * Drops this worktree's disposable database.
 *
 * The target is recomputed from the worktree path rather than accepted as an
 * argument, so this can only ever drop the database this worktree created — not
 * another worktree's, and not a database someone named on the command line.
 */

async function main() {
  const expected = worktreeDatabaseName(repoRoot);
  const { adminUrl } = resolveTestDatabase();
  const template = new URL(adminUrl);

  if (!LOCAL_HOSTS.includes(template.hostname)) {
    throw new Error(
      `Refusing to drop anything: the server host ${template.hostname} is not local`,
    );
  }

  const client = new Client({ connectionString: template.toString() });
  await client.connect();

  try {
    const { rowCount } = await client.query(
      'select 1 from pg_database where datname = $1',
      [expected],
    );
    if (rowCount === 0) {
      console.log(`[e2e] nothing to drop: ${expected}`);
      return;
    }

    await client.query(`drop database "${expected}" with (force)`);
    console.log(`[e2e] dropped ${expected}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[e2e] ${error.message}`);
  process.exit(1);
});
