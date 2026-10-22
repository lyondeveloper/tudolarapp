'use strict';

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  apiRoot,
  databaseNameOf,
  resolveTestDatabase,
} = require('./e2e-environment.cjs');
const {
  grantRuntimePrivileges,
  provisionDatabase,
} = require('./provision-e2e-database.cjs');
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

function runSync(nodeArgs, env = process.env) {
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: apiRoot,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  const { url, migrationUrl, adminUrl, runtimeBaseUrl, derived } =
    resolveTestDatabase();

  await provisionDatabase(adminUrl, url, {
    createIfMissing: derived,
    runtimeBaseUrl,
  });

  const migrationEnv = {
    ...process.env,
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: migrationUrl,
  };
  runSync([prismaCli, 'generate'], migrationEnv);
  runSync([prismaCli, 'migrate', 'deploy'], migrationEnv);
  await grantRuntimePrivileges(migrationUrl, url);

  await seedVerifiedAccount(url);
  console.log(`[e2e] seeded ${SEEDED_ACCOUNT.username}`);
  console.log(
    `[e2e] starting the API against ${databaseNameOf(url)} on port ${process.env.PORT ?? 3000}`,
  );

  const apiEnv = { ...process.env, DATABASE_URL: url };
  delete apiEnv.MIGRATION_DATABASE_URL;
  const api = spawn('npm', ['run', 'start'], {
    cwd: apiRoot,
    env: apiEnv,
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
