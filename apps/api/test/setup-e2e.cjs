const { generateKeyPairSync, randomBytes } = require('node:crypto');
const { URL } = require('node:url');

process.env.NODE_ENV = 'test';

// `npm run test:e2e` derives a disposable database per worktree and points
// DATABASE_URL at it; an explicit TUDOLAR_TEST_DATABASE_URL still wins.
const testDatabaseUrl =
  process.env.TUDOLAR_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TUDOLAR_TEST_DATABASE_URL must point to a disposable local test database, or run through `npm run test:e2e`, which derives one per worktree',
  );
}

const parsedDatabaseUrl = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1));
if (!['localhost', '127.0.0.1', '::1'].includes(parsedDatabaseUrl.hostname) || !/_test$/i.test(databaseName)) {
  throw new Error('TUDOLAR_TEST_DATABASE_URL must target a local database ending in _test');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_ISSUER = 'https://api.tudolar.test';
process.env.JWT_AUDIENCE = 'tudolar-api-test';
process.env.WEBAUTHN_RP_ID = 'localhost';
process.env.WEBAUTHN_RP_NAME = 'TUDOLAR Test';
process.env.WEBAUTHN_ORIGINS = 'http://localhost:3000';
process.env.PHONE_OTP_PEPPER = randomBytes(32).toString('hex');
process.env.EMAIL_DELIVERY_MODE = 'test';
process.env.SMS_DELIVERY_MODE = 'test';

const keyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
process.env.JWT_PRIVATE_KEY = keyPair.privateKey;
process.env.JWT_PUBLIC_KEY = keyPair.publicKey;
