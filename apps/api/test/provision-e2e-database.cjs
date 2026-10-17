'use strict';

const { Client } = require('pg');

const { SAFE_IDENTIFIER, databaseNameOf } = require('./e2e-environment.cjs');

/**
 * Creates this worktree's disposable database if it is missing and installs
 * PostGIS in it.
 *
 * PostGIS has to be installed per database — the extension is not inherited —
 * and it needs a role with the right privilege, which the local container
 * provides because the PostGIS image's `POSTGRES_USER` is the cluster superuser.
 * A shared environment will not have that, so the failure is reported as a
 * concrete blocker instead of surfacing as a confusing test error.
 */
async function provisionDatabase(adminUrl, url) {
  const name = databaseNameOf(url);
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(
      `Refusing to create a database whose name is not a safe identifier: ${name}`,
    );
  }

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const existing = await admin.query(
      'select 1 from pg_database where datname = $1',
      [name],
    );
    if (existing.rowCount === 0) {
      // CREATE DATABASE cannot be parameterized; the name passed the allowlist above.
      await admin.query(`create database "${name}"`);
      console.log(`[e2e] created disposable database ${name}`);
    } else {
      console.log(`[e2e] reusing disposable database ${name}`);
    }
  } finally {
    await admin.end();
  }

  const target = new Client({ connectionString: url });
  await target.connect();
  try {
    await target.query('create extension if not exists postgis');
  } catch (error) {
    throw new Error(
      `Could not install PostGIS in ${name}: ${error.message}\n` +
        'Creating the extension needs a role with the right privilege. ' +
        'See docs/testing/e2e.md for the local prerequisite.',
    );
  } finally {
    await target.end();
  }
}

module.exports = { provisionDatabase };
