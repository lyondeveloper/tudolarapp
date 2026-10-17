'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  apiRoot,
  databaseNameOf,
  resolveTestDatabase,
} = require('./e2e-environment.cjs');
const { provisionDatabase } = require('./provision-e2e-database.cjs');
const { resetDatabase } = require('./reset-e2e-database.cjs');

const prismaCli = path.join(apiRoot, 'node_modules/prisma/build/index.js');
const jestCli = path.join(apiRoot, 'node_modules/jest/bin/jest.js');

function run(nodeArgs) {
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
  console.log(`[e2e] database ${databaseNameOf(url)}`);

  // Prisma Migrate reads the URL from prisma.config.ts, which resolves
  // DATABASE_URL. Point it at the disposable test database for this process.
  process.env.DATABASE_URL = url;

  // The generated client is git-ignored, so e2e must not rely on the install-time
  // postinstall hook having run.
  run([prismaCli, 'generate']);
  run([prismaCli, 'migrate', 'deploy']);

  // Start from a known data state, so a result never depends on a previous run.
  const { truncated } = await resetDatabase(url);
  console.log(
    `[e2e] reset ${truncated.length} table${truncated.length === 1 ? '' : 's'}`,
  );

  // The Prisma 7 client loads its WASM query compiler through a dynamic import,
  // which Jest's CommonJS VM rejects unless this flag is set.
  run([
    '--experimental-vm-modules',
    jestCli,
    '--config',
    './test/jest-e2e.json',
    ...process.argv.slice(2),
  ]);
}

main().catch((error) => {
  console.error(`[e2e] ${error.message}`);
  process.exit(1);
});
