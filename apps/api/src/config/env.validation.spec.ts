import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { validateEnvironment } from './env.validation';

function validEnvironment(): Record<string, unknown> {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://local:local@127.0.0.1:5432/tudolar',
    JWT_PRIVATE_KEY: keyPair.privateKey,
    JWT_PUBLIC_KEY: keyPair.publicKey,
    JWT_ISSUER: 'https://api.tudolar.test',
    JWT_AUDIENCE: 'tudolar-api-test',
    WEBAUTHN_RP_ID: 'localhost',
    WEBAUTHN_RP_NAME: 'TUDOLAR Test',
    WEBAUTHN_ORIGINS: 'http://localhost:3000',
    PHONE_OTP_PEPPER: randomBytes(32).toString('hex'),
  };
}

describe('validateEnvironment', () => {
  it('rejects mismatched JWT signing and verification keys', () => {
    const environment = validEnvironment();
    const otherKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    expect(() =>
      validateEnvironment({
        ...environment,
        JWT_PUBLIC_KEY: otherKeyPair.publicKey,
      }),
    ).toThrow('matching RSA key pair');
  });
});
