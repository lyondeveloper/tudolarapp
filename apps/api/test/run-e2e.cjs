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

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(
  path.join(apiRoot, 'node_modules/node-pg-migrate/bin/node-pg-migrate.js'),
  ['up', '--database-url-var', 'TUDOLAR_TEST_DATABASE_URL', '--migrations-dir', 'migrations'],
);
run(path.join(apiRoot, 'node_modules/jest/bin/jest.js'), [
  '--config',
  './test/jest-e2e.json',
  ...process.argv.slice(2),
]);
