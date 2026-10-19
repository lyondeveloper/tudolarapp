'use strict';

const { Client } = require('pg');
const { URL } = require('node:url');

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
 * The maintenance role creates the database and grants the runtime role DML
 * access. The runtime role never owns the database or its schema.
 */
function parseConnection(url, source) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${source} must be a valid PostgreSQL URL`);
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${source} must use a PostgreSQL protocol`);
  }
  return parsed;
}

function quoteIdentifier(identifier, source) {
  if (!SAFE_IDENTIFIER.test(identifier)) {
    throw new Error(
      `${source} is not a safe PostgreSQL identifier: ${identifier}`,
    );
  }
  return `"${identifier}"`;
}

async function ensureRuntimeRole(adminUrl, runtimeUrl) {
  const runtime = parseConnection(runtimeUrl, 'DATABASE_URL');
  const roleName = decodeURIComponent(runtime.username);
  quoteIdentifier(roleName, 'runtime role');

  const admin = new Client({ connectionString: adminUrl });
  let connected = false;
  try {
    await admin.connect();
    connected = true;

    let { rows } = await admin.query(
      `SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolcanlogin
         FROM pg_roles
        WHERE rolname = $1`,
      [roleName],
    );

    if (rows.length === 0) {
      const password = decodeURIComponent(runtime.password);
      if (!password) {
        throw new Error(
          `Cannot provision runtime role ${roleName} without a password in DATABASE_URL`,
        );
      }
      const statement = await admin.query(
        `SELECT format(
           'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT',
           $1::text,
           $2::text
         ) AS ddl`,
        [roleName, password],
      );
      await admin.query(statement.rows[0].ddl);
      console.log(`[e2e] created restricted runtime role ${roleName}`);
      ({ rows } = await admin.query(
        `SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolcanlogin
           FROM pg_roles
          WHERE rolname = $1`,
        [roleName],
      ));
    }

    const role = rows[0];
    if (
      !role ||
      role.rolsuper ||
      role.rolcreatedb ||
      role.rolcreaterole ||
      role.rolbypassrls ||
      !role.rolcanlogin
    ) {
      throw new Error(
        `Runtime role ${roleName} must be a login without superuser, database, role, or RLS-bypass privileges`,
      );
    }

    const memberships = await admin.query(
      `SELECT 1
         FROM pg_auth_members
        WHERE member = (SELECT oid FROM pg_roles WHERE rolname = $1)
        LIMIT 1`,
      [roleName],
    );
    if (memberships.rowCount !== 0) {
      throw new Error(`Runtime role ${roleName} must not inherit another role`);
    }

    return roleName;
  } finally {
    if (connected) await admin.end();
  }
}

async function grantRuntimePrivileges(maintenanceUrl, runtimeUrl) {
  const maintenance = parseConnection(maintenanceUrl, 'MIGRATION_DATABASE_URL');
  const runtime = parseConnection(runtimeUrl, 'DATABASE_URL');
  const maintenanceRole = quoteIdentifier(
    decodeURIComponent(maintenance.username),
    'maintenance role',
  );
  const runtimeRole = quoteIdentifier(
    decodeURIComponent(runtime.username),
    'runtime role',
  );
  const databaseName = databaseNameOf(runtimeUrl);
  quoteIdentifier(databaseName, 'runtime database');

  const admin = new Client({ connectionString: maintenance.toString() });
  let connected = false;
  try {
    await admin.connect();
    connected = true;
    await admin.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName, 'runtime database')} TO ${runtimeRole}`,
    );
    await admin.query(
      `REVOKE CREATE ON DATABASE ${quoteIdentifier(databaseName, 'runtime database')} FROM PUBLIC`,
    );

    maintenance.pathname = `/${databaseName}`;
    const target = new Client({ connectionString: maintenance.toString() });
    await target.connect();
    try {
      const ownership = await target.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM pg_database
             WHERE datname = current_database()
               AND datdba = (SELECT oid FROM pg_roles WHERE rolname = $1)
           ) AS owns_database,
           EXISTS (
             SELECT 1 FROM pg_namespace
             WHERE nspname = 'public'
               AND nspowner = (SELECT oid FROM pg_roles WHERE rolname = $1)
           ) AS owns_public_schema`,
        [decodeURIComponent(runtime.username)],
      );
      if (
        ownership.rows[0].owns_database ||
        ownership.rows[0].owns_public_schema
      ) {
        throw new Error(
          `Runtime role ${decodeURIComponent(runtime.username)} must not own the database or public schema`,
        );
      }

      await target.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await target.query(
        'REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC',
      );
      await target.query(
        'REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC',
      );
      await target.query(
        `REVOKE CREATE ON DATABASE ${quoteIdentifier(databaseName, 'runtime database')} FROM ${runtimeRole}`,
      );
      await target.query(`GRANT USAGE ON SCHEMA public TO ${runtimeRole}`);
      await target.query(`REVOKE CREATE ON SCHEMA public FROM ${runtimeRole}`);
      await target.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${runtimeRole}`,
      );
      await target.query(
        `REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM ${runtimeRole}`,
      );
      await target.query(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${runtimeRole}`,
      );
      await target.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${maintenanceRole} IN SCHEMA public
         GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${runtimeRole}`,
      );
      await target.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${maintenanceRole} IN SCHEMA public
         GRANT USAGE, SELECT ON SEQUENCES TO ${runtimeRole}`,
      );
    } finally {
      await target.end();
    }
  } finally {
    if (connected) await admin.end();
  }
}

async function provisionDatabase(
  adminUrl,
  runtimeUrl,
  { createIfMissing = true, runtimeBaseUrl = runtimeUrl } = {},
) {
  const name = databaseNameOf(runtimeUrl);
  quoteIdentifier(name, 'runtime database');
  const roleName = await ensureRuntimeRole(adminUrl, runtimeUrl);
  const admin = new Client({ connectionString: adminUrl });
  let connected = false;
  try {
    await admin.connect();
    connected = true;
    const existing = await admin.query(
      'select 1 from pg_database where datname = $1',
      [name],
    );
    if (existing.rowCount === 0) {
      if (!createIfMissing) {
        throw new Error(
          `The explicit disposable database ${name} does not exist; refusing to create it`,
        );
      }
      // The identifier passed an allowlist check and is never user-supplied.
      await admin.query(`create database "${name}"`);
      console.log(`[e2e] created disposable database ${name}`);
    } else {
      console.log(`[e2e] reusing disposable database ${name}`);
    }
  } finally {
    if (connected) await admin.end();
  }

  await grantRuntimePrivileges(adminUrl, runtimeBaseUrl);
  await grantRuntimePrivileges(adminUrl, runtimeUrl);
  console.log(`[e2e] restricted runtime role ${roleName}`);
}

module.exports = {
  provisionDatabase,
  ensureRuntimeRole,
  grantRuntimePrivileges,
};
