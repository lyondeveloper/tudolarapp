import type {
  AuthenticatedUser,
  PasskeyCredential,
  User,
} from '../domain/user';

export type EmailActionPurpose =
  'verify_email' | 'password_reset' | 'add_password';
export type AuthChallengePurpose =
  'passkey_registration' | 'passkey_authentication';

export type PasswordAccount = AuthenticatedUser;

export interface AuthChallengeRecord {
  id: string;
  purpose: AuthChallengePurpose;
  challenge: string;
  userId: string | null;
  context: Record<string, unknown>;
  expiresAt: Date;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenFamilyId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreatePasswordAccount {
  displayName: string;
  username: string;
  usernameNormalized: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  emailTokenHash: string;
  emailTokenExpiresAt: Date;
}

export interface IdentityRepositoryPort {
  findByIdentifier(identifier: string): Promise<PasswordAccount | null>;
  findById(userId: string): Promise<PasswordAccount | null>;
  createPasswordAccount(input: CreatePasswordAccount): Promise<boolean>;
  findPasskeyByCredentialId(credentialId: string): Promise<{
    user: User;
    credential: PasskeyCredential;
  } | null>;
  updatePasskeyCounter(credentialId: string, counter: number): Promise<void>;
  createAuthChallenge(input: {
    purpose: AuthChallengePurpose;
    challenge: string;
    userId?: string;
    context?: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<string>;
  getAuthChallenge(
    id: string,
    purpose: AuthChallengePurpose,
  ): Promise<AuthChallengeRecord | null>;
  completePasskeyRegistration(input: {
    challengeId: string;
    challenge: string;
    userId: string;
    displayName: string;
    credential: Omit<PasskeyCredential, 'id' | 'userId'>;
    now: Date;
  }): Promise<User | null>;
  completePasskeyEnrollment(input: {
    challengeId: string;
    challenge: string;
    userId: string;
    credential: Omit<PasskeyCredential, 'id' | 'userId'>;
    now: Date;
  }): Promise<boolean>;
  consumeAuthChallenge(
    id: string,
    purpose: AuthChallengePurpose,
    now: Date,
  ): Promise<boolean>;
  createEmailAction(input: {
    userId: string;
    purpose: EmailActionPurpose;
    tokenHash: string;
    expiresAt: Date;
    context?: Record<string, unknown>;
  }): Promise<void>;
  completeEmailVerification(tokenHash: string, now: Date): Promise<boolean>;
  resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<string | null>;
  createPhoneChallenge(input: {
    userId: string;
    phoneE164: string;
    codeHmac: string;
    expiresAt: Date;
  }): Promise<void>;
  verifyPhoneChallenge(input: {
    userId: string;
    phoneE164: string;
    codeHmac: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean>;
  markPhoneVerified(
    userId: string,
    phoneE164: string,
    verifiedAt: Date,
  ): Promise<void>;
  createSession(input: {
    id: string;
    userId: string;
    tokenFamilyId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findSessionByRefreshHash(hash: string): Promise<AuthSessionRecord | null>;
  rotateSession(input: {
    sessionId: string;
    oldHash: string;
    newSessionId: string;
    newHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean>;
  revokeSession(
    sessionId: string,
    userId: string,
    revokedAt: Date,
  ): Promise<void>;
  revokeSessionFamily(tokenFamilyId: string, revokedAt: Date): Promise<void>;
  revokeUserSessions(userId: string, revokedAt: Date): Promise<void>;
}

export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface CryptoProviderPort {
  generateId(): string;
  generateOpaqueToken(): string;
  hashToken(token: string): string;
  generatePhoneCode(): string;
  hashPhoneCode(userId: string, phoneE164: string, code: string): string;
}

export interface ClockPort {
  now(): Date;
}

export interface AccessTokenIssuerPort {
  issue(userId: string, sessionId: string): Promise<string>;
}

export interface EmailDeliveryPort {
  readonly available: boolean;
  sendVerification(email: string, token: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendPasswordChanged(email: string): Promise<void>;
}

export interface SmsDeliveryPort {
  readonly available: boolean;
  sendPhoneVerification(phoneE164: string, code: string): Promise<void>;
}

export interface WebAuthnAdapterPort {
  generateRegistrationOptions(input: {
    userId: string;
    username: string;
    displayName: string;
    excludeCredentialIds?: string[];
  }): Promise<{ challenge: string; options: Record<string, unknown> }>;
  verifyRegistration(input: {
    response: unknown;
    expectedChallenge: string;
  }): Promise<Omit<PasskeyCredential, 'id' | 'userId'> | null>;
  generateAuthenticationOptions(input?: {
    allowCredentialIds?: string[];
  }): Promise<{ challenge: string; options: Record<string, unknown> }>;
  verifyAuthentication(input: {
    response: unknown;
    expectedChallenge: string;
    credential: PasskeyCredential;
  }): Promise<{ newCounter: number } | null>;
}
