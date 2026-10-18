import { Logger } from '@nestjs/common';
import type {
  ClockPort,
  CryptoProviderPort,
  EmailDeliveryPort,
  IdentityRepositoryPort,
  PasswordHasherPort,
  SmsDeliveryPort,
  WebAuthnAdapterPort,
} from './auth.ports';
import { AuthService } from './auth.service';
import type { PasskeyCredential, User } from '../domain/user';
import { SessionService } from './session.service';

describe('AuthService passkey authentication', () => {
  it('rejects a counter regression instead of accepting a potentially cloned credential', async () => {
    const user: User = {
      id: 'user-id',
      displayName: 'Test User',
      username: null,
      email: null,
      emailVerifiedAt: null,
      phoneE164: null,
      phoneVerifiedAt: null,
      accountStatus: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const credential: PasskeyCredential = {
      id: 'credential-row-id',
      userId: user.id,
      credentialId: 'credential-id',
      publicKey: new Uint8Array([1, 2, 3]),
      signatureCounter: 5,
      transports: [],
      deviceType: 'singleDevice',
      backedUp: false,
    };
    const updatePasskeyCounter = jest.fn();
    const issueSession = jest.fn();
    const clock: ClockPort = {
      now: () => new Date('2026-01-01T00:01:00.000Z'),
    };
    const identity = {
      getAuthChallenge: jest.fn().mockResolvedValue({
        id: 'challenge-id',
        purpose: 'passkey_authentication',
        challenge: 'server-challenge',
        userId: null,
        context: {},
        expiresAt: new Date('2026-01-01T00:05:00.000Z'),
      }),
      findPasskeyByCredentialId: jest
        .fn()
        .mockResolvedValue({ user, credential }),
      consumeAuthChallenge: jest.fn().mockResolvedValue(true),
      updatePasskeyCounter,
    } as unknown as IdentityRepositoryPort;
    const webAuthn = {
      verifyAuthentication: jest.fn().mockResolvedValue({ newCounter: 4 }),
    } as unknown as WebAuthnAdapterPort;
    const sessions = { issue: issueSession } as unknown as SessionService;
    const service = new AuthService(
      identity,
      {} as PasswordHasherPort,
      { available: false } as EmailDeliveryPort,
      { available: false } as SmsDeliveryPort,
      webAuthn,
      {} as CryptoProviderPort,
      clock,
      sessions,
    );

    await expect(
      service.completePasskeyAuthentication('challenge-id', {
        id: 'credential-id',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(updatePasskeyCounter).not.toHaveBeenCalled();
    expect(issueSession).not.toHaveBeenCalled();
  });

  it('allows counterless multi-device credentials', async () => {
    const user: User = {
      id: 'passkey-user',
      displayName: 'Passkey User',
      username: null,
      email: null,
      emailVerifiedAt: null,
      phoneE164: null,
      phoneVerifiedAt: null,
      accountStatus: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const credential: PasskeyCredential = {
      id: 'credential-row-id',
      userId: user.id,
      credentialId: 'credential-id',
      publicKey: new Uint8Array([1, 2, 3]),
      signatureCounter: 5,
      transports: [],
      deviceType: 'multiDevice',
      backedUp: true,
    };
    const updatePasskeyCounter = jest.fn();
    const identity = {
      getAuthChallenge: jest.fn().mockResolvedValue({
        id: 'challenge-id',
        purpose: 'passkey_authentication',
        challenge: 'server-challenge',
        userId: null,
        context: {},
        expiresAt: new Date('2026-01-01T00:05:00.000Z'),
      }),
      findPasskeyByCredentialId: jest
        .fn()
        .mockResolvedValue({ user, credential }),
      consumeAuthChallenge: jest.fn().mockResolvedValue(true),
      updatePasskeyCounter,
    } as unknown as IdentityRepositoryPort;
    const sessions = {
      issue: jest.fn().mockResolvedValue({ accessToken: 'signed-token' }),
    } as unknown as SessionService;
    const service = new AuthService(
      identity,
      {} as PasswordHasherPort,
      { available: false } as EmailDeliveryPort,
      { available: false } as SmsDeliveryPort,
      {
        verifyAuthentication: jest.fn().mockResolvedValue({ newCounter: 0 }),
      } as unknown as WebAuthnAdapterPort,
      {} as CryptoProviderPort,
      { now: () => new Date('2026-01-01T00:01:00.000Z') },
      sessions,
    );

    await expect(
      service.completePasskeyAuthentication('challenge-id', {
        id: 'credential-id',
      }),
    ).resolves.toMatchObject({ accessToken: 'signed-token' });
    expect(updatePasskeyCounter).toHaveBeenCalledWith('credential-id', 0);
  });
});

// AGENTS.md:81 — "Log useful diagnostics with appropriate access/retention,
// excluding credentials and tokens." A delivery outage must be visible to the
// operator even though the caller-facing response stays uniform, so it does not
// disclose whether an account exists.
describe('AuthService delivery failure diagnostics', () => {
  const registrationMessage =
    'If registration can be completed, verification instructions will be sent.';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function captureErrorLogs(): string[] {
    const logged: string[] = [];
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((message: unknown) => {
        logged.push(String(message));
      });
    return logged;
  }

  it('logs a failed verification email without disclosing whether the account exists', async () => {
    const logged = captureErrorLogs();

    const identity = {
      createPasswordAccount: jest.fn().mockResolvedValue(true),
    } as unknown as IdentityRepositoryPort;
    const emailDelivery = {
      available: true,
      sendVerification: jest
        .fn()
        .mockRejectedValue(new Error('smtp unavailable')),
      sendPasswordReset: jest.fn(),
      sendPasswordChanged: jest.fn(),
    } as unknown as EmailDeliveryPort;
    const service = new AuthService(
      identity,
      {
        hash: jest.fn().mockResolvedValue('hashed-password'),
      } as unknown as PasswordHasherPort,
      emailDelivery,
      { available: false } as SmsDeliveryPort,
      {} as WebAuthnAdapterPort,
      {
        generateOpaqueToken: () => 'verification-token',
        hashToken: () => 'verification-token-hash',
      } as unknown as CryptoProviderPort,
      { now: () => new Date('2026-01-01T00:00:00.000Z') },
      {} as SessionService,
    );

    const result = await service.registerWithPassword({
      username: 'alice',
      email: 'alice@example.test',
      displayName: 'Alice',
      password: 'correct-horse-battery-staple',
    });

    // The response is unchanged: nothing about account existence is disclosed.
    expect(result).toEqual({ message: registrationMessage });

    // ...but the failure is an observable, logged signal for the operator.
    const diagnostics = logged.join(' ');
    expect(logged.length).toBeGreaterThan(0);
    expect(diagnostics).toContain('smtp unavailable');
    // Never the credential or the recipient's personal data.
    expect(diagnostics).not.toContain('verification-token');
    expect(diagnostics).not.toContain('alice@example.test');
  });

  it('logs a failed phone-verification SMS before answering service unavailable', async () => {
    const logged = captureErrorLogs();

    const identity = {
      createPhoneChallenge: jest.fn().mockResolvedValue(undefined),
    } as unknown as IdentityRepositoryPort;
    const smsDelivery = {
      available: true,
      sendPhoneVerification: jest
        .fn()
        .mockRejectedValue(new Error('sms gateway down')),
    } as unknown as SmsDeliveryPort;
    const service = new AuthService(
      identity,
      {} as PasswordHasherPort,
      { available: false } as EmailDeliveryPort,
      smsDelivery,
      {} as WebAuthnAdapterPort,
      {
        generatePhoneCode: () => '123456',
        hashPhoneCode: () => 'code-hash',
      } as unknown as CryptoProviderPort,
      { now: () => new Date('2026-01-01T00:00:00.000Z') },
      {} as SessionService,
    );

    await expect(
      service.requestPhoneVerification({
        userId: 'user-1',
        phoneE164: '+15551234567',
      }),
    ).rejects.toMatchObject({ code: 'SMS_DELIVERY_UNAVAILABLE' });

    const diagnostics = logged.join(' ');
    expect(logged.length).toBeGreaterThan(0);
    expect(diagnostics).toContain('sms gateway down');
    expect(diagnostics).not.toContain('123456');
    expect(diagnostics).not.toContain('+15551234567');
  });
});
