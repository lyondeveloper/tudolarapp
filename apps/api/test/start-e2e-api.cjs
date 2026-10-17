'use strict';

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  apiRoot,
  databaseNameOf,
  resolveTestDatabase,
} = require('./e2e-environment.cjs');
const { provisionDatabase } = require('./provision-e2e-database.cjs');
const { SEEDED_ACCOUNT, seedVerifiedAccount } = require('./seed-e2e.cjs');

/**
 * Runs the API against this worktree's disposable database, seeded, so the
 * mobile end-to-end flows have something real to talk to.
 *
 * It is self-sufficient on purpose: it provisions and migrates the database
 * first, so an agent can run it in a fresh worktree without having run the API
 * suite beforehand.
 */

const prismaCli = path.join(apiRoot, 'node_modules/prisma/build/index.js');

function runSync(nodeArgs) {
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  const { url, derived, adminUrl } = resolveTestDatabase();

  if (derived) {
    await provisionDatabase(adminUrl, url);
  }
  process.env.DATABASE_URL = url;

  runSync([prismaCli, 'generate']);
  runSync([prismaCli, 'migrate', 'deploy']);

  await seedVerifiedAccount(url);
  console.log(`[e2e] seeded ${SEEDED_ACCOUNT.username}`);
  console.log(
    `[e2e] starting the API against ${databaseNameOf(url)} on port ${process.env.PORT ?? 3000}`,
  );

  const api = spawn('npm', ['run', 'start'], {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });

  const stop = () => api.kill('SIGTERM');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  api.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(`[e2e] ${error.message}`);
  process.exit(1);
});
