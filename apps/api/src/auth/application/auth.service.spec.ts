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
