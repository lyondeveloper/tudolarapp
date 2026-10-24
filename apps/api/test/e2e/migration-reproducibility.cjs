'use strict';

const { spawnSync } = require('node:child_process');
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

const prismaCli = path.join(apiRoot, 'node_modules/prisma/build/index.js');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const INIT_MIGRATION = '20261015150121_init_identity_schema';

const EXPECTED_CHECK_CONSTRAINTS = [
  'auth_challenges_purpose_check',
  'auth_sessions_expiry_check',
  'email_action_tokens_purpose_check',
  'offer_terms_versions_amount_range_check',
  'offer_terms_versions_give_amount_positive_check',
  'offer_terms_versions_margin_pct_check',
  'offer_terms_versions_max_amount_positive_check',
  'offer_terms_versions_min_amount_positive_check',
  'offer_terms_versions_pair_id_check',
  'offer_terms_versions_rate_pair_check',
  'offer_terms_versions_receive_amount_positive_check',
  'offer_terms_versions_version_positive_check',
  'passkey_signature_counter_nonnegative_check',
  'phone_verification_attempts_nonnegative_check',
  'users_account_status_check',
];

const EXPECTED_EXTENSIONS = ['postgis'];

function migrationAdminUrl() {
  const url = new URL(resolveTestDatabase().adminUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('The migration connection must use a PostgreSQL URL');
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      'Refusing to create a reproducibility scratch database on a non-local host',
    );
  }
  return url;
}

function runPrisma(args, scratchUrlString) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: apiRoot,
    env: {
      ...process.env,
      DATABASE_URL: scratchUrlString,
      MIGRATION_DATABASE_URL: scratchUrlString,
    },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `prisma ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

async function assertCatalog(client) {
  const checks = await client.query(
    `SELECT c.conname AS name
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       JOIN pg_class rel ON rel.oid = c.conrelid
      WHERE n.nspname = 'public'
        AND c.contype = 'c'
        AND c.conname NOT LIKE '%_not_null'
        AND rel.relname <> 'spatial_ref_sys'
      ORDER BY c.conname`,
  );
  const actualChecks = checks.rows.map((r) => r.name);
  if (
    JSON.stringify(actualChecks) !==
    JSON.stringify([...EXPECTED_CHECK_CONSTRAINTS].sort())
  ) {
    throw new Error(
      `Hand-written CHECK constraint mismatch. Expected ${JSON.stringify(
        EXPECTED_CHECK_CONSTRAINTS,
      )}, found ${JSON.stringify(actualChecks)}`,
    );
  }

  const exts = await client.query(
    `SELECT extname AS name FROM pg_extension WHERE extname = 'postgis' ORDER BY extname`,
  );
  const actualExts = exts.rows.map((r) => r.name);
  if (JSON.stringify(actualExts) !== JSON.stringify(EXPECTED_EXTENSIONS)) {
    throw new Error(
      `PostGIS extension mismatch. Expected ${JSON.stringify(
        EXPECTED_EXTENSIONS,
      )}, found ${JSON.stringify(actualExts)}`,
    );
  }
}

async function runEmptyDatabaseScenario(admin, adminUrl) {
  const databaseName = `tudolar_repro_empty_${randomUUID().replaceAll('-', '')}_test`;
  if (!SAFE_IDENTIFIER.test(databaseName)) {
    throw new Error('Generated scratch database name is not safe');
  }

  await admin.query(`CREATE DATABASE "${databaseName}"`);
  let scratch;
  try {
    const scratchUrl = new URL(adminUrl);
    scratchUrl.pathname = `/${databaseName}`;
    const scratchUrlString = scratchUrl.toString();

    runPrisma(['migrate', 'deploy'], scratchUrlString);
    runPrisma(
      [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
      ],
      scratchUrlString,
    );

    scratch = new Client({ connectionString: scratchUrlString });
    await scratch.connect();
    await assertCatalog(scratch);
  } finally {
    if (scratch) await scratch.end();
    await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  }
}

async function runExistingRowsScenario(admin, adminUrl) {
  const databaseName = `tudolar_repro_rows_${randomUUID().replaceAll('-', '')}_test`;
  if (!SAFE_IDENTIFIER.test(databaseName)) {
    throw new Error('Generated scratch database name is not safe');
  }

  await admin.query(`CREATE DATABASE "${databaseName}"`);
  let scratch;
  try {
    const scratchUrl = new URL(adminUrl);
    scratchUrl.pathname = `/${databaseName}`;
    const scratchUrlString = scratchUrl.toString();

    scratch = new Client({ connectionString: scratchUrlString });
    await scratch.connect();

    const initSql = fs.readFileSync(
      path.join(apiRoot, 'prisma', 'migrations', INIT_MIGRATION, 'migration.sql'),
      'utf8',
    );
    await scratch.query(initSql);
    runPrisma(['migrate', 'resolve', '--applied', INIT_MIGRATION], scratchUrlString);

    const userId = randomUUID();
    const passkeyId = randomUUID();
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const challengeId = randomUUID();
    const emailTokenId = randomUUID();
    const phoneChallengeId = randomUUID();

    await scratch.query(
      `INSERT INTO "users" ("id", "display_name", "username", "username_normalized", "email", "email_normalized", "account_status")
       VALUES ($1::uuid, 'Existing User', 'existing_user', 'existing_user', 'existing@example.com', 'existing@example.com', 'active')`,
      [userId],
    );
    await scratch.query(
      `INSERT INTO "passkey_credentials" ("id", "user_id", "credential_id", "public_key", "signature_counter")
       VALUES ($1::uuid, $2::uuid, 'cred-repro-1', $3, 4)`,
      [passkeyId, userId, Buffer.from([1, 2, 3, 4])],
    );
    await scratch.query(
      `INSERT INTO "auth_sessions" ("id", "user_id", "token_family_id", "refresh_token_hash", "expires_at")
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'refresh-hash-repro-1', now() + interval '7 days')`,
      [sessionId, userId, familyId],
    );
    await scratch.query(
      `INSERT INTO "auth_challenges" ("id", "purpose", "challenge", "user_id", "expires_at")
       VALUES ($1::uuid, 'passkey_authentication', 'challenge-repro-1', $2::uuid, now() + interval '10 minutes')`,
      [challengeId, userId],
    );
    await scratch.query(
      `INSERT INTO "email_action_tokens" ("id", "user_id", "purpose", "token_hash", "expires_at")
       VALUES ($1::uuid, $2::uuid, 'verify_email', 'email-token-hash-repro-1', now() + interval '30 minutes')`,
      [emailTokenId, userId],
    );
    await scratch.query(
      `INSERT INTO "phone_verification_challenges" ("id", "user_id", "phone_e164", "code_hmac", "expires_at", "attempts")
       VALUES ($1::uuid, $2::uuid, '+584121234567', 'hmac-repro-1', now() + interval '10 minutes', 1)`,
      [phoneChallengeId, userId],
    );

    runPrisma(['migrate', 'deploy'], scratchUrlString);

    const userRow = await scratch.query(
      `SELECT "display_name", "username_normalized", "account_status" FROM "users" WHERE "id" = $1::uuid`,
      [userId],
    );
    const passkeyRow = await scratch.query(
      `SELECT "credential_id", "signature_counter"::text AS counter FROM "passkey_credentials" WHERE "id" = $1::uuid`,
      [passkeyId],
    );
    const sessionRow = await scratch.query(
      `SELECT "refresh_token_hash" FROM "auth_sessions" WHERE "id" = $1::uuid`,
      [sessionId],
    );
    const challengeRow = await scratch.query(
      `SELECT "purpose", "challenge" FROM "auth_challenges" WHERE "id" = $1::uuid`,
      [challengeId],
    );
    const emailRow = await scratch.query(
      `SELECT "purpose", "token_hash" FROM "email_action_tokens" WHERE "id" = $1::uuid`,
      [emailTokenId],
    );
    const phoneRow = await scratch.query(
      `SELECT "phone_e164", "attempts" FROM "phone_verification_challenges" WHERE "id" = $1::uuid`,
      [phoneChallengeId],
    );

    if (
      userRow.rows[0]?.display_name !== 'Existing User' ||
      passkeyRow.rows[0]?.credential_id !== 'cred-repro-1' ||
      passkeyRow.rows[0]?.counter !== '4' ||
      sessionRow.rows[0]?.refresh_token_hash !== 'refresh-hash-repro-1' ||
      challengeRow.rows[0]?.challenge !== 'challenge-repro-1' ||
      emailRow.rows[0]?.token_hash !== 'email-token-hash-repro-1' ||
      phoneRow.rows[0]?.phone_e164 !== '+584121234567' ||
      phoneRow.rows[0]?.attempts !== 1
    ) {
      throw new Error('Existing identity rows were altered or lost by pending migrations');
    }

    await assertCatalog(scratch);
  } finally {
    if (scratch) await scratch.end();
    await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  }
}

async function run() {
  const adminUrl = migrationAdminUrl();
  const admin = new Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
    await runEmptyDatabaseScenario(admin, adminUrl);
    await runExistingRowsScenario(admin, adminUrl);

    const remaining = await admin.query(
      `SELECT datname FROM pg_database WHERE datname LIKE 'tudolar_repro_%_test'`,
    );
    if (remaining.rowCount !== 0) {
      throw new Error(
        `Scratch databases were not dropped: ${remaining.rows.map((r) => r.datname).join(', ')}`,
      );
    }

    console.log(
      'Migration reproducibility checks passed (empty database + existing identity rows).',
    );
  } finally {
    await admin.end();
  }
}

run().catch((error) => {
  console.error(`[e2e:migrations] ${error.message}`);
  process.exitCode = 1;
});
