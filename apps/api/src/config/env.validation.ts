import {
  createPrivateKey,
  createPublicKey,
  timingSafeEqual,
} from 'node:crypto';

const requiredVariables = [
  'DATABASE_URL',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'WEBAUTHN_RP_ID',
  'WEBAUTHN_RP_NAME',
  'WEBAUTHN_ORIGINS',
  'PHONE_OTP_PEPPER',
] as const;

function normalizeJwtKeyPair(environment: Record<string, unknown>): {
  privateKey: string;
  publicKey: string;
} {
  const privatePem = (environment.JWT_PRIVATE_KEY as string).replace(
    /\\n/g,
    '\n',
  );
  const publicPem = (environment.JWT_PUBLIC_KEY as string).replace(
    /\\n/g,
    '\n',
  );

  try {
    const privateKey = createPrivateKey(privatePem);
    const publicKey = createPublicKey(publicPem);
    if (
      privateKey.asymmetricKeyType !== 'rsa' ||
      publicKey.asymmetricKeyType !== 'rsa' ||
      (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
      throw new Error();
    }

    const derivedPublicKey = createPublicKey(privateKey).export({
      type: 'spki',
      format: 'der',
    });
    const configuredPublicKey = publicKey.export({
      type: 'spki',
      format: 'der',
    });
    if (
      derivedPublicKey.length !== configuredPublicKey.length ||
      !timingSafeEqual(derivedPublicKey, configuredPublicKey)
    ) {
      throw new Error();
    }

    return {
      privateKey: String(privateKey.export({ type: 'pkcs8', format: 'pem' })),
      publicKey: String(publicKey.export({ type: 'spki', format: 'pem' })),
    };
  } catch {
    throw new Error(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be a matching RSA key pair of at least 2048 bits',
    );
  }
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const missing = requiredVariables.filter(
    (name) => typeof environment[name] !== 'string' || !environment[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(environment.DATABASE_URL as string);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use a PostgreSQL protocol');
  }

  const origins = (environment.WEBAUTHN_ORIGINS as string)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('WEBAUTHN_ORIGINS must be a non-empty explicit allowlist');
  }

  if ((environment.PHONE_OTP_PEPPER as string).length < 32) {
    throw new Error('PHONE_OTP_PEPPER must contain at least 32 characters');
  }

  const jwtKeyPair = normalizeJwtKeyPair(environment);
  const nodeEnvironment = environment.NODE_ENV ?? 'development';
  const emailDeliveryMode = environment.EMAIL_DELIVERY_MODE ?? 'unavailable';
  const smsDeliveryMode = environment.SMS_DELIVERY_MODE ?? 'unavailable';
  const port = Number(environment.PORT ?? 3000);
  const accessTtl = Number(environment.JWT_ACCESS_TTL_SECONDS ?? 600);
  const refreshTtl = Number(environment.JWT_REFRESH_TTL_SECONDS ?? 2_592_000);

  if (
    nodeEnvironment === 'production' &&
    (environment.WEBAUTHN_RP_ID as string).toLowerCase() === 'localhost'
  ) {
    throw new Error(
      'WEBAUTHN_RP_ID must use a production domain outside development',
    );
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (
    !Number.isInteger(accessTtl) ||
    accessTtl < 1 ||
    !Number.isInteger(refreshTtl) ||
    refreshTtl < 1
  ) {
    throw new Error('JWT token lifetimes must be positive integers');
  }
  if (!['test', 'unavailable'].includes(emailDeliveryMode as string)) {
    throw new Error('EMAIL_DELIVERY_MODE must be test or unavailable');
  }
  if (!['test', 'unavailable'].includes(smsDeliveryMode as string)) {
    throw new Error('SMS_DELIVERY_MODE must be test or unavailable');
  }
  if (
    nodeEnvironment !== 'test' &&
    (emailDeliveryMode === 'test' || smsDeliveryMode === 'test')
  ) {
    throw new Error(
      'Test delivery adapters may only be enabled in NODE_ENV=test',
    );
  }
  if (
    nodeEnvironment === 'production' &&
    (emailDeliveryMode === 'unavailable' || smsDeliveryMode === 'unavailable')
  ) {
    throw new Error(
      'Production email and SMS delivery adapters must be configured',
    );
  }

  return {
    ...environment,
    NODE_ENV: nodeEnvironment,
    JWT_PRIVATE_KEY: jwtKeyPair.privateKey,
    JWT_PUBLIC_KEY: jwtKeyPair.publicKey,
    PORT: port,
    JWT_ACCESS_TTL_SECONDS: accessTtl,
    JWT_REFRESH_TTL_SECONDS: refreshTtl,
    EMAIL_DELIVERY_MODE: emailDeliveryMode,
    SMS_DELIVERY_MODE: smsDeliveryMode,
  };
}
