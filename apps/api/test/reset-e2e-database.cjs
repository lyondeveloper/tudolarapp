'use strict';

const { Client } = require('pg');

/**
 * Returns the harness to a known data state before the suite runs.
 *
 * A result must never depend on what a previous run left behind, and parallel
 * worktrees must not see each other's rows even when they share a database name.
 * Recreating the database would re-run migrations on every invocation, so the
 * data is truncated instead.
 *
 * Excluded on purpose:
 *   - `_prisma_migrations` is the migration ledger; truncating it would make the
 *     next `migrate deploy` replay migrations that already ran.
 *   - `spatial_ref_sys` is PostGIS reference data, not application data.
 */
const PRESERVED_TABLES = ['_prisma_migrations', 'spatial_ref_sys'];

async function resetDatabase(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows } = await client.query(
      `select tablename from pg_tables
        where schemaname = 'public' and tablename <> all($1::text[])
        order by tablename`,
      [PRESERVED_TABLES],
    );

    const tables = rows.map((row) => row.tablename);
    if (tables.length === 0) return { truncated: [] };

    // Identifiers cannot be parameterized; they come from pg_tables, not from
    // user input, and are quoted so a mixed-case name cannot break the statement.
    const list = tables.map((name) => `"${name}"`).join(', ');
    await client.query(`truncate table ${list} restart identity cascade`);

    return { truncated: tables };
  } finally {
    await client.end();
  }
}

module.exports = { resetDatabase, PRESERVED_TABLES };
