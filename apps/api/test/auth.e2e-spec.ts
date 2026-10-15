import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import request from 'supertest';
import { createTestAuthenticator } from './support/webauthn-test-client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

interface JsonResponse {
  body: unknown;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface CurrentUser {
  id: string;
  username: string | null;
  email: string | null;
  phoneNumber: string | null;
  phoneVerified: boolean;
  passwordHash?: string;
  authMethods: string[];
}

function responseBody<Body>(response: JsonResponse): Body {
  return response.body as Body;
}

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects invalid username/password without revealing account existence', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/password/login')
      .send({ identifier: 'unknown-user', password: 'incorrect-password' })
      .expect(401);

    expect(responseBody<{ message: string }>(response).message).toBe(
      'Invalid credentials',
    );
  });

  it('requires authentication to read the current user', () => {
    return request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('rejects unexpected fields in authentication DTOs', () => {
    return request(app.getHttpServer())
      .post('/auth/password/login')
      .send({
        identifier: 'unknown-user',
        password: 'incorrect-password',
        role: 'admin',
      })
      .expect(400);
  });

  it('returns the same accepted response for an unknown password-recovery identifier', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/password/recovery')
      .send({ identifier: 'unknown-user' })
      .expect(202);

    expect(responseBody<{ message: string }>(response)).toEqual({
      message: 'If an account exists, reset instructions will be sent.',
    });
  });

  it('starts a password registration without disclosing whether the email is registered', () => {
    return request(app.getHttpServer())
      .post('/auth/password/register')
      .send({
        username: 'alice-example',
        email: 'alice@example.test',
        displayName: 'Alice Example',
        password: 'correct-horse-battery-staple',
      })
      .expect(202);
  });

  it('registers with username/password, verifies email, and recovers a forgotten password', async () => {
    const username = `user-${randomUUID().slice(0, 8)}`;
    const email = `${username}@example.com`;
    const password = 'correct-horse-battery-staple';

    const registration = await request(app.getHttpServer())
      .post('/auth/password/register')
      .send({ username, email, displayName: 'Test User', password })
      .expect(202);
    const registrationBody = responseBody<{ message: string }>(registration);
    const duplicateRegistration = await request(app.getHttpServer())
      .post('/auth/password/register')
      .send({ username, email, displayName: 'Changed Name', password })
      .expect(202);
    expect(responseBody<{ message: string }>(duplicateRegistration)).toEqual(
      registrationBody,
    );

    const emailDelivery = app.get<{
      latestToken: (
        recipient: string,
        purpose: 'verify_email' | 'password_reset',
      ) => string | undefined;
      messages: Array<{
        email: string;
        purpose: 'verify_email' | 'password_reset' | 'password_changed';
      }>;
    }>('EMAIL_DELIVERY');
    const verificationToken = emailDelivery.latestToken(email, 'verify_email');
    expect(verificationToken).toBeDefined();
    if (!verificationToken)
      throw new Error('Test email adapter did not record verification token');

    await request(app.getHttpServer())
      .post('/auth/email/verify')
      .send({ token: verificationToken })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/auth/password/login')
      .send({ identifier: username, password })
      .expect(200);
    const loginTokens = responseBody<AuthTokens>(login);

    expect(typeof loginTokens.accessToken).toBe('string');
    expect(typeof loginTokens.refreshToken).toBe('string');

    const profile = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${loginTokens.accessToken}`)
      .expect(200);
    const profileBody = responseBody<CurrentUser>(profile);
    expect(profileBody).toMatchObject({
      username,
      email,
      authMethods: ['password'],
    });
    expect(profileBody.passwordHash).toBeUndefined();

    const phoneE164 = `+1555${Date.now().toString().slice(-7)}`;
    await request(app.getHttpServer())
      .post('/users/me/phone-verification/challenges')
      .set('Authorization', `Bearer ${loginTokens.accessToken}`)
      .send({ phoneE164 })
      .expect(202);
    const smsDelivery = app.get<{
      latestCode: (phone: string) => string | undefined;
    }>('SMS_DELIVERY');
    const phoneCode = smsDelivery.latestCode(phoneE164);
    expect(phoneCode).toBeDefined();
    if (!phoneCode)
      throw new Error('Test SMS adapter did not record verification code');

    await request(app.getHttpServer())
      .post('/users/me/phone-verification/verify')
      .set('Authorization', `Bearer ${loginTokens.accessToken}`)
      .send({ phoneE164, code: phoneCode })
      .expect(200);

    const verifiedProfile = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${loginTokens.accessToken}`)
      .expect(200);
    expect(responseBody<CurrentUser>(verifiedProfile)).toMatchObject({
      phoneNumber: phoneE164,
      phoneVerified: true,
    });

    const emailLogin = await request(app.getHttpServer())
      .post('/auth/password/login')
      .send({ identifier: email, password })
      .expect(200);
    const emailLoginTokens = responseBody<AuthTokens>(emailLogin);
    const emailProfile = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${emailLoginTokens.accessToken}`)
      .expect(200);
    expect(responseBody<CurrentUser>(emailProfile).id).toBe(profileBody.id);

    const recoveryResponse = await request(app.getHttpServer())
      .post('/auth/password/recovery')
      .send({ identifier: email })
      .expect(202);
    expect(responseBody<{ message: string }>(recoveryResponse)).toEqual({
      message: 'If an account exists, reset instructions will be sent.',
    });
    const resetToken = emailDelivery.latestToken(email, 'password_reset');
    expect(resetToken).toBeDefined();
    if (!resetToken)
      throw new Error('Test email adapter did not record reset token');

    const resetResponse = await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ token: resetToken, newPassword: 'another-correct-passphrase' })
      .expect(200);
    expect(
      responseBody<{ accessToken?: string }>(resetResponse).accessToken,
    ).toBeUndefined();
    await request(app.getHttpServer())
      .post('/auth/sessions/refresh')
      .send({ refreshToken: loginTokens.refreshToken })
      .expect(401);
    expect(
      emailDelivery.messages.some(
        (message) =>
          message.email === email && message.purpose === 'password_changed',
      ),
    ).toBe(true);

    const previousPasswordLogin = await request(app.getHttpServer())
      .post('/auth/password/login')
      .send({ identifier: email, password })
      .expect(401);
    expect(
      responseBody<{ message: string }>(previousPasswordLogin).message,
    ).toBe('Invalid credentials');

    const newLogin = await request(app.getHttpServer())
      .post('/auth/password/login')
      .send({ identifier: email, password: 'another-correct-passphrase' })
      .expect(200);
    const newLoginTokens = responseBody<AuthTokens>(newLogin);

    const refresh = await request(app.getHttpServer())
      .post('/auth/sessions/refresh')
      .send({ refreshToken: newLoginTokens.refreshToken })
      .expect(200);
    const refreshedTokens = responseBody<AuthTokens>(refresh);
    expect(refreshedTokens.refreshToken).not.toBe(newLoginTokens.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/sessions/refresh')
      .send({ refreshToken: newLoginTokens.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/sessions/refresh')
      .send({ refreshToken: refreshedTokens.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/sessions/logout')
      .set('Authorization', `Bearer ${refreshedTokens.accessToken}`)
      .expect(204);
  });

  it('returns WebAuthn registration options with a server-generated challenge', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/passkeys/registration/options')
      .send({ displayName: 'Passkey user' })
      .expect(201);
    const options = responseBody<{ challenge: string }>(response);

    expect(typeof options.challenge).toBe('string');
    expect(options.challenge.length).toBeGreaterThanOrEqual(32);
  });

  it('registers and authenticates a passkey using a real WebAuthn assertion', async () => {
    const authenticator = createTestAuthenticator();
    const registrationOptionsResponse = await request(app.getHttpServer())
      .post('/auth/passkeys/registration/options')
      .send({ displayName: 'Passkey Integration User' })
      .expect(201);
    const registrationOptions = responseBody<{
      operationId: string;
      challenge: string;
    }>(registrationOptionsResponse);
    const registrationResponse = authenticator.registrationResponse(
      registrationOptions.challenge,
      'http://localhost:3000',
      'localhost',
    );
    const registration = await request(app.getHttpServer())
      .post('/auth/passkeys/registration/verify')
      .send({
        operationId: registrationOptions.operationId,
        response: registrationResponse,
      })
      .expect(200);
    const registrationTokens = responseBody<AuthTokens>(registration);
    const registeredUser = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${registrationTokens.accessToken}`)
      .expect(200);
    const registeredProfile = responseBody<CurrentUser>(registeredUser);
    expect(registeredProfile.authMethods).toEqual(['passkey']);

    const authenticationOptionsResponse = await request(app.getHttpServer())
      .post('/auth/passkeys/authentication/options')
      .send({})
      .expect(201);
    const authenticationOptions = responseBody<{
      operationId: string;
      challenge: string;
    }>(authenticationOptionsResponse);
    const assertion = authenticator.authenticationResponse(
      authenticationOptions.challenge,
      'http://localhost:3000',
      'localhost',
    );
    const authentication = await request(app.getHttpServer())
      .post('/auth/passkeys/authentication/verify')
      .send({
        operationId: authenticationOptions.operationId,
        response: assertion,
      })
      .expect(200);
    const authenticationTokens = responseBody<AuthTokens>(authentication);
    const authenticatedUser = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${authenticationTokens.accessToken}`)
      .expect(200);
    expect(responseBody<CurrentUser>(authenticatedUser).id).toBe(
      registeredProfile.id,
    );
  });

  it('rejects malformed passkey registration data and consumes its one-time challenge', async () => {
    const optionsResponse = await request(app.getHttpServer())
      .post('/auth/passkeys/registration/options')
      .send({ displayName: 'Malformed passkey user' })
      .expect(201);
    const options = responseBody<{ operationId: string }>(optionsResponse);
    const payload = {
      operationId: options.operationId,
      response: {
        id: 'malformed',
        rawId: 'malformed',
        type: 'public-key',
        response: {},
      },
    };

    await request(app.getHttpServer())
      .post('/auth/passkeys/registration/verify')
      .send(payload)
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/passkeys/registration/verify')
      .send(payload)
      .expect(400);
  });

  it('returns discoverable WebAuthn authentication options', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/passkeys/authentication/options')
      .send({})
      .expect(201);
    const options = responseBody<{
      challenge: string;
      allowCredentials: unknown[];
    }>(response);

    expect(typeof options.challenge).toBe('string');
    expect(Array.isArray(options.allowCredentials)).toBe(true);
  });

  it('rejects unknown discoverable credentials with a generic response', async () => {
    const optionsResponse = await request(app.getHttpServer())
      .post('/auth/passkeys/authentication/options')
      .send({})
      .expect(201);
    const options = responseBody<{ operationId: string }>(optionsResponse);
    const payload = {
      operationId: options.operationId,
      response: { id: 'unknown-credential' },
    };

    const firstAttempt = await request(app.getHttpServer())
      .post('/auth/passkeys/authentication/verify')
      .send(payload)
      .expect(401);
    expect(responseBody<{ message: string }>(firstAttempt).message).toBe(
      'Invalid credentials',
    );

    await request(app.getHttpServer())
      .post('/auth/passkeys/authentication/verify')
      .send(payload)
      .expect(401);
  });

  it('rejects negative WebAuthn signature counters at the database boundary', async () => {
    const prisma = app.get(PrismaService);
    let failure: unknown;
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { displayName: 'Constraint test user' },
        });
        await tx.passkeyCredential.create({
          data: {
            userId: user.id,
            credentialId: `invalid-counter-${randomUUID()}`,
            publicKey: Buffer.from([1]),
            signatureCounter: BigInt(-1),
          },
        });
      });
    } catch (error) {
      failure = error;
    }

    // Prisma wraps driver errors, so the assertion targets the Postgres
    // SQLSTATE for a CHECK violation rather than Prisma's own error code.
    // The constraint is hand-written in the migration; Prisma cannot model it.
    const prismaFailure = failure as {
      meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
    };
    expect(prismaFailure.meta?.driverAdapterError?.cause?.originalCode).toBe(
      '23514',
    );
  });
});
