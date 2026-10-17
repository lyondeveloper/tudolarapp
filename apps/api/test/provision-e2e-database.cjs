'use strict';

const { Client } = require('pg');

const { SAFE_IDENTIFIER, databaseNameOf } = require('./e2e-environment.cjs');

/**
 * Creates this worktree's disposable database if it is missing.
 *
 * PostGIS is *not* installed here: the Prisma migration
 * `20261017190000_add_postgis_extension` installs it when the runner applies
 * migrations with `prisma migrate deploy`, because Prisma Migrate is the single
 * migration authority (ADR-0019, ADR-0023). Installing the extension here would
 * make that migration a no-op and hide a database that has no PostGIS.
 *
 * Creating the database still needs a role with the right privilege, which the
 * local container provides because the PostGIS image's `POSTGRES_USER` is the
 * cluster superuser. A shared environment will not have that, so the failure is
 * reported as a concrete blocker instead of surfacing as a confusing test error.
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
}

module.exports = { provisionDatabase };
