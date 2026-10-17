'use strict';

const argon2 = require('argon2');
const { Client } = require('pg');

const { databaseNameOf, resolveTestDatabase } = require('./e2e-environment.cjs');

/**
 * Seeds an account the sign-in flows can use.
 *
 * Registration cannot complete locally: `env.validation.ts` deliberately refuses
 * the in-memory delivery adapters outside `NODE_ENV=test`, and email delivery is
 * unconfigured otherwise, so no verification token can be delivered. Seeding a
 * verified account keeps the flow real instead of loosening that guard.
 *
 * The hash uses `Argon2PasswordHasher`'s exact parameters, so it verifies through
 * the same code path a registered account would.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const SEEDED_ACCOUNT = {
  displayName: 'E2E Demo',
  username: 'e2e-demo',
  email: 'e2e-demo@tudolar.test',
  password: 'e2e-demo-password',
};

async function seedVerifiedAccount(connectionString) {
  const passwordHash = await argon2.hash(SEEDED_ACCOUNT.password, ARGON2_OPTIONS);

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('delete from users where username_normalized = $1', [
      SEEDED_ACCOUNT.username,
    ]);
    const { rows } = await client.query(
      `insert into users (
         display_name, username, username_normalized,
         email, email_normalized, email_verified_at,
         password_hash, account_status
       ) values ($1, $2, $3, $4, $5, now(), $6, 'active')
       returning id`,
      [
        SEEDED_ACCOUNT.displayName,
        SEEDED_ACCOUNT.username,
        SEEDED_ACCOUNT.username,
        SEEDED_ACCOUNT.email,
        SEEDED_ACCOUNT.email,
        passwordHash,
      ],
    );

    return { ...SEEDED_ACCOUNT, id: rows[0].id };
  } finally {
    await client.end();
  }
}

async function main() {
  const { url } = resolveTestDatabase();
  const account = await seedVerifiedAccount(url);
  console.log(
    `[e2e] seeded ${account.username} in ${databaseNameOf(url)} ` +
      `(password ${account.password})`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[e2e] ${error.message}`);
    process.exit(1);
  });
}

module.exports = { seedVerifiedAccount, SEEDED_ACCOUNT };
