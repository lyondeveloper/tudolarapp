'use strict';

const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { Client } = require('pg');

const {
  apiRoot,
  SAFE_IDENTIFIER,
  resolveTestDatabase,
} = require('../e2e-environment.cjs');

const TABLE_MIGRATION = '20261017200000_offer_terms_versions_immutability';
const CHECKS_MIGRATION = '20261018210152_offer_terms_version_checks';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function migrationAdminUrl() {
  const url = new URL(resolveTestDatabase().adminUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('The migration connection must use a PostgreSQL URL');
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      'Refusing to create a preflight database on a non-local host',
    );
  }

  return url;
}

function migrationSql(name) {
  return fs.readFileSync(
    path.join(apiRoot, 'prisma', 'migrations', name, 'migration.sql'),
    'utf8',
  );
}

async function run() {
  const adminUrl = migrationAdminUrl();
  const databaseName = `tudolar_preflight_${randomUUID().replaceAll('-', '')}_test`;
  if (!SAFE_IDENTIFIER.test(databaseName)) {
    throw new Error('Generated migration-preflight database name is not safe');
  }

  const admin = new Client({ connectionString: adminUrl.toString() });
  let scratch;
  let created = false;

  try {
    await admin.connect();
    const existing = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );
    if (existing.rowCount !== 0) {
      throw new Error(
        `Refusing to reuse existing scratch database ${databaseName}`,
      );
    }

    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;

    const scratchUrl = new URL(adminUrl);
    scratchUrl.pathname = `/${databaseName}`;
    scratch = new Client({ connectionString: scratchUrl.toString() });
    await scratch.connect();
    await scratch.query(migrationSql(TABLE_MIGRATION));

    const invalidId = randomUUID();
    await scratch.query(
      `INSERT INTO "offer_terms_versions"
         ("id", "offer_id", "version", "pair_id", "give_amount", "receive_amount",
          "rate", "margin_pct", "min_amount", "max_amount", "expires_at")
       VALUES ($1::uuid, $2::uuid, 1, 'NOT_A_PAIR', 1000, 1, 0.001, 1, 1, 1000,
               now() + interval '7 days')`,
      [invalidId, randomUUID()],
    );

    let migrationError;
    try {
      await scratch.query(migrationSql(CHECKS_MIGRATION));
    } catch (error) {
      migrationError = error;
    }

    if (
      !migrationError ||
      migrationError.code !== '23514' ||
      !migrationError.message.includes(invalidId)
    ) {
      throw new Error(
        `Expected preflight to reject row ${invalidId} with SQLSTATE 23514; received ` +
          `${migrationError?.code ?? 'success'}: ${migrationError?.message ?? ''}`,
      );
    }

    const invalidRows = await scratch.query(
      'SELECT "id"::text AS id FROM "offer_terms_versions" WHERE "id" = $1::uuid',
      [invalidId],
    );
    const installedChecks = await scratch.query(
      `SELECT conname FROM pg_constraint
        WHERE conrelid = 'offer_terms_versions'::regclass
          AND conname LIKE 'offer_terms_versions_%_check'`,
    );
    if (invalidRows.rowCount !== 1 || installedChecks.rowCount !== 0) {
      throw new Error(
        `Preflight changed existing data or installed checks: rowCount=${invalidRows.rowCount}, ` +
          `checkCount=${installedChecks.rowCount}`,
      );
    }

    console.log(
      `Migration preflight rejected invalid row ${invalidId} and preserved it.`,
    );
  } finally {
    if (scratch) await scratch.end();
    if (created) {
      await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    }
    await admin.end();
  }
}

run().catch((error) => {
  console.error(`[e2e:preflight] ${error.message}`);
  process.exitCode = 1;
});
