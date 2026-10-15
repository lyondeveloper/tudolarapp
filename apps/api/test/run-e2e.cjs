const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { URL } = require('node:url');

const apiRoot = path.resolve(__dirname, '..');
const testDatabaseUrl = process.env.TUDOLAR_TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TUDOLAR_TEST_DATABASE_URL must point to a disposable local test database');
}

let databaseUrl;
try {
  databaseUrl = new URL(testDatabaseUrl);
} catch {
  throw new Error('TUDOLAR_TEST_DATABASE_URL must be a valid PostgreSQL URL');
}
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (
  !['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname) ||
  !databaseName.endsWith('_test')
) {
  throw new Error('TUDOLAR_TEST_DATABASE_URL must target a local database ending in _test');
}

// Prisma Migrate reads the URL from prisma.config.ts, which resolves
// DATABASE_URL. Point it at the disposable test database for this process.
process.env.DATABASE_URL = testDatabaseUrl;

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

// The generated client is git-ignored, so e2e must not rely on the install-time
// postinstall hook having run.
run([prismaCli, 'generate']);
run([prismaCli, 'migrate', 'deploy']);
// The Prisma 7 client loads its WASM query compiler through a dynamic import,
// which Jest's CommonJS VM rejects unless this flag is set.
run([
  '--experimental-vm-modules',
  jestCli,
  '--config',
  './test/jest-e2e.json',
  ...process.argv.slice(2),
]);
