'use strict';

const { spawnSync } = require('node:child_process');
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
const { resetDatabase } = require('./reset-e2e-database.cjs');

const prismaCli = path.join(apiRoot, 'node_modules/prisma/build/index.js');
const jestCli = path.join(apiRoot, 'node_modules/jest/bin/jest.js');
const preflightScript = path.join(
  apiRoot,
  'test/e2e/offer-terms-version-preflight.cjs',
);

function run(nodeArgs, env = process.env) {
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

  run([preflightScript], {
    ...process.env,
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: adminUrl,
  });
  await provisionDatabase(adminUrl, url, {
    createIfMissing: derived,
    runtimeBaseUrl,
  });
  console.log(`[e2e] database ${databaseNameOf(url)}`);

  const migrationEnv = {
    ...process.env,
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: migrationUrl,
  };

  // The generated client is git-ignored, so e2e must not rely on the install-time
  // postinstall hook having run.
  run([prismaCli, 'generate'], migrationEnv);
  run([prismaCli, 'migrate', 'deploy'], migrationEnv);
  await grantRuntimePrivileges(migrationUrl, url);

  // Start from a known data state, so a result never depends on a previous run.
  const { truncated } = await resetDatabase(migrationUrl);
  console.log(
    `[e2e] reset ${truncated.length} table${truncated.length === 1 ? '' : 's'}`,
  );

  const testEnv = {
    ...process.env,
    DATABASE_URL: url,
    TUDOLAR_TEST_DATABASE_URL: url,
  };
  delete testEnv.MIGRATION_DATABASE_URL;

  // The Prisma 7 client loads its WASM query compiler through a dynamic import,
  // which Jest's CommonJS VM rejects unless this flag is set.
  run(
    [
      '--experimental-vm-modules',
      jestCli,
      '--config',
      './test/jest-e2e.json',
      ...process.argv.slice(2),
    ],
    testEnv,
  );
}

main().catch((error) => {
  console.error(`[e2e] ${error.message}`);
  process.exit(1);
});
