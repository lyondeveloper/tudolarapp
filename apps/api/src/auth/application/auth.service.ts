import type {
  AuthLoggerPort,
  ClockPort,
  CryptoProviderPort,
  EmailDeliveryPort,
  IdentityRepositoryPort,
  PasswordHasherPort,
  SmsDeliveryPort,
  WebAuthnAdapterPort,
} from './auth.ports';
import { AuthApplicationError } from './auth.errors';
import type {
  PasswordEnrollmentInput,
  PasswordLoginInput,
  PasswordRegistrationInput,
  PasswordResetInput,
  PhoneChallengeInput,
  PhoneVerificationInput,
} from './auth.commands';
import type { AcceptedResponse, AuthTokenPair } from './auth.models';
import {
  normalizedEmail,
  normalizedIdentifier,
  normalizedUsername,
} from '../domain/identity-normalization';
import { hasString } from './auth.validation';
import { SessionService } from './session.service';

const acceptedRecoveryMessage =
  'If an account exists, reset instructions will be sent.';
const acceptedRegistrationMessage =
  'If registration can be completed, verification instructions will be sent.';
const challengeLifetimeMs = 5 * 60 * 1000;
const emailActionLifetimeMs = 30 * 60 * 1000;

export class AuthService {
  constructor(
    private readonly identity: IdentityRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly emailDelivery: EmailDeliveryPort,
    private readonly smsDelivery: SmsDeliveryPort,
    private readonly webAuthn: WebAuthnAdapterPort,
    private readonly crypto: CryptoProviderPort,
    private readonly clock: ClockPort,
    private readonly sessions: SessionService,
    private readonly authLogger: AuthLoggerPort,
  ) {}

  async registerWithPassword(
    input: PasswordRegistrationInput,
  ): Promise<AcceptedResponse> {
    if (!this.emailDelivery.available) {
      throw new AuthApplicationError('EMAIL_DELIVERY_UNAVAILABLE');
    }

    const username = input.username.trim();
    const usernameNormalized = normalizedUsername(input.username);
    const email = input.email.trim();
    const emailNormalized = normalizedEmail(input.email);
    const passwordHash = await this.passwordHasher.hash(input.password);
    const emailToken = this.crypto.generateOpaqueToken();
    const now = this.clock.now();
    const created = await this.identity.createPasswordAccount({
      displayName: input.displayName.trim(),
      username,
      usernameNormalized,
      email,
      emailNormalized,
      passwordHash,
      emailTokenHash: this.crypto.hashToken(emailToken),
      emailTokenExpiresAt: new Date(now.getTime() + emailActionLifetimeMs),
    });

    if (created) {
      try {
        await this.emailDelivery.sendVerification(email, emailToken);
      } catch (error) {
        this.logDeliveryFailure('verification email', error);
        return { message: acceptedRegistrationMessage };
      }
    }
    return { message: acceptedRegistrationMessage };
  }

  async loginWithPassword(input: PasswordLoginInput): Promise<AuthTokenPair> {
    const account = await this.identity.findByIdentifier(
      normalizedIdentifier(input.identifier),
    );
    let passwordMatches = false;
    if (account?.passwordHash) {
      passwordMatches = await this.passwordHasher.verify(
        account.passwordHash,
        input.password,
      );
    } else {
      await this.passwordHasher.hash(input.password);
    }

    if (
      !account ||
      !passwordMatches ||
      !account.emailVerifiedAt ||
      account.accountStatus !== 'active'
    ) {
      throw new AuthApplicationError('INVALID_CREDENTIALS');
    }
    return this.sessions.issue(account.id);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verified = await this.identity.completeEmailVerification(
      this.crypto.hashToken(token),
      this.clock.now(),
    );
    if (!verified) throw new AuthApplicationError('INVALID_EMAIL_ACTION');
    return { message: 'Email verified' };
  }

  async requestPasswordRecovery(identifier: string): Promise<AcceptedResponse> {
    if (!this.emailDelivery.available) {
      throw new AuthApplicationError('EMAIL_DELIVERY_UNAVAILABLE');
    }

    const account = await this.identity.findByIdentifier(
      normalizedIdentifier(identifier),
    );
    if (account?.email && account.emailVerifiedAt && account.passwordHash) {
      const token = this.crypto.generateOpaqueToken();
      await this.identity.createEmailAction({
        userId: account.id,
        purpose: 'password_reset',
        tokenHash: this.crypto.hashToken(token),
        expiresAt: new Date(this.clock.now().getTime() + emailActionLifetimeMs),
      });
      try {
        await this.emailDelivery.sendPasswordReset(account.email, token);
      } catch (error) {
        this.logDeliveryFailure('password reset email', error);
        return { message: acceptedRecoveryMessage };
      }
    }
    return { message: acceptedRecoveryMessage };
  }

  async resetPassword(input: PasswordResetInput): Promise<{ message: string }> {
    const email = await this.identity.resetPassword(
      this.crypto.hashToken(input.token),
      await this.passwordHasher.hash(input.newPassword),
      this.clock.now(),
    );
    if (!email) throw new AuthApplicationError('INVALID_EMAIL_ACTION');
    try {
      await this.emailDelivery.sendPasswordChanged(email);
    } catch (error) {
      this.logDeliveryFailure('password changed email', error);
      return { message: 'Password updated' };
    }
    return { message: 'Password updated' };
  }

  async beginPasswordEnrollment(
    userId: string,
    input: PasswordEnrollmentInput,
  ): Promise<AcceptedResponse> {
    if (!this.emailDelivery.available) {
      throw new AuthApplicationError('EMAIL_DELIVERY_UNAVAILABLE');
    }
    const account = await this.identity.findById(userId);
    if (!account || account.accountStatus !== 'active') {
      throw new AuthApplicationError('USER_NOT_FOUND');
    }
    if (account.authMethods.includes('password')) {
      throw new AuthApplicationError('AUTH_METHOD_UNAVAILABLE');
    }

    const token = this.crypto.generateOpaqueToken();
    const email = input.email.trim();
    await this.identity.createEmailAction({
      userId,
      purpose: 'add_password',
      tokenHash: this.crypto.hashToken(token),
      expiresAt: new Date(this.clock.now().getTime() + emailActionLifetimeMs),
      context: {
        email,
        emailNormalized: normalizedEmail(email),
        username: input.username.trim(),
        usernameNormalized: normalizedUsername(input.username),
        passwordHash: await this.passwordHasher.hash(input.password),
      },
    });
    try {
      await this.emailDelivery.sendVerification(email, token);
    } catch (error) {
      this.logDeliveryFailure('enrollment verification email', error);
      return { message: acceptedRegistrationMessage };
    }
    return { message: acceptedRegistrationMessage };
  }

  async startPasskeyRegistration(
    displayName: string,
    currentUserId?: string,
  ): Promise<Record<string, unknown>> {
    const targetUserId = currentUserId ?? this.crypto.generateId();
    const currentUser = currentUserId
      ? await this.identity.findById(currentUserId)
      : null;
    if (
      currentUserId &&
      (!currentUser || currentUser.accountStatus !== 'active')
    ) {
      throw new AuthApplicationError('USER_NOT_FOUND');
    }

    const webAuthnOptions = await this.webAuthn.generateRegistrationOptions({
      userId: targetUserId,
      username: currentUser?.username ?? targetUserId,
      displayName: currentUser?.displayName ?? displayName.trim(),
      excludeCredentialIds: [],
    });
    const operationId = await this.identity.createAuthChallenge({
      purpose: 'passkey_registration',
      challenge: webAuthnOptions.challenge,
      userId: currentUserId,
      context: {
        targetUserId,
        displayName: currentUser?.displayName ?? displayName.trim(),
      },
      expiresAt: new Date(this.clock.now().getTime() + challengeLifetimeMs),
    });
    return { ...webAuthnOptions.options, operationId };
  }

  async completePasskeyRegistration(
    operationId: string,
    response: unknown,
    currentUserId?: string,
  ): Promise<AuthTokenPair | AcceptedResponse> {
    const challenge = await this.identity.getAuthChallenge(
      operationId,
      'passkey_registration',
    );
    if (
      !challenge ||
      (challenge.userId && challenge.userId !== currentUserId)
    ) {
      throw new AuthApplicationError('INVALID_PASSKEY_CHALLENGE');
    }
    const credential = await this.webAuthn.verifyRegistration({
      response,
      expectedChallenge: challenge.challenge,
    });
    if (!credential) {
      await this.identity.consumeAuthChallenge(
        operationId,
        'passkey_registration',
        this.clock.now(),
      );
      throw new AuthApplicationError('INVALID_PASSKEY_RESPONSE');
    }

    if (challenge.userId) {
      const added = await this.identity.completePasskeyEnrollment({
        challengeId: operationId,
        challenge: challenge.challenge,
        userId: challenge.userId,
        credential,
        now: this.clock.now(),
      });
      if (!added) throw new AuthApplicationError('INVALID_PASSKEY_CHALLENGE');
      return { message: 'Passkey added' };
    }

    const userId = challenge.context.targetUserId;
    const displayName = challenge.context.displayName;
    if (!hasString(userId) || !hasString(displayName)) {
      throw new AuthApplicationError('INVALID_PASSKEY_CHALLENGE');
    }
    const user = await this.identity.completePasskeyRegistration({
      challengeId: operationId,
      challenge: challenge.challenge,
      userId,
      displayName,
      credential,
      now: this.clock.now(),
    });
    if (!user) throw new AuthApplicationError('INVALID_PASSKEY_CHALLENGE');
    return this.sessions.issue(user.id);
  }

  async startPasskeyAuthentication(): Promise<Record<string, unknown>> {
    const webAuthnOptions = await this.webAuthn.generateAuthenticationOptions();
    const operationId = await this.identity.createAuthChallenge({
      purpose: 'passkey_authentication',
      challenge: webAuthnOptions.challenge,
      expiresAt: new Date(this.clock.now().getTime() + challengeLifetimeMs),
    });
    return { ...webAuthnOptions.options, operationId };
  }

  async completePasskeyAuthentication(
    operationId: string,
    response: unknown,
  ): Promise<AuthTokenPair> {
    const challenge = await this.identity.getAuthChallenge(
      operationId,
      'passkey_authentication',
    );
    const credentialId =
      typeof response === 'object' &&
      response !== null &&
      'id' in response &&
      typeof response.id === 'string'
        ? response.id
        : null;
    const passkey = credentialId
      ? await this.identity.findPasskeyByCredentialId(credentialId)
      : null;
    if (!challenge || !passkey || passkey.user.accountStatus !== 'active') {
      if (challenge) {
        await this.identity.consumeAuthChallenge(
          operationId,
          'passkey_authentication',
          this.clock.now(),
        );
      }
      throw new AuthApplicationError('INVALID_CREDENTIALS');
    }

    const verified = await this.webAuthn.verifyAuthentication({
      response,
      expectedChallenge: challenge.challenge,
      credential: passkey.credential,
    });
    const consumed = await this.identity.consumeAuthChallenge(
      operationId,
      'passkey_authentication',
      this.clock.now(),
    );
    if (!verified || !consumed)
      throw new AuthApplicationError('INVALID_CREDENTIALS');
    if (
      passkey.credential.deviceType === 'singleDevice' &&
      passkey.credential.signatureCounter > 0 &&
      verified.newCounter <= passkey.credential.signatureCounter
    ) {
      throw new AuthApplicationError('INVALID_CREDENTIALS');
    }

    await this.identity.updatePasskeyCounter(
      passkey.credential.credentialId,
      verified.newCounter,
    );
    return this.sessions.issue(passkey.user.id);
  }

  refreshSession(refreshToken: string): Promise<AuthTokenPair> {
    return this.sessions.refresh(refreshToken);
  }

  logout(userId: string, sessionId: string): Promise<void> {
    return this.sessions.logout(userId, sessionId);
  }

  async requestPhoneVerification(
    input: PhoneChallengeInput,
  ): Promise<AcceptedResponse> {
    if (!this.smsDelivery.available) {
      throw new AuthApplicationError('SMS_DELIVERY_UNAVAILABLE');
    }
    const code = this.crypto.generatePhoneCode();
    await this.identity.createPhoneChallenge({
      userId: input.userId,
      phoneE164: input.phoneE164,
      codeHmac: this.crypto.hashPhoneCode(input.userId, input.phoneE164, code),
      expiresAt: new Date(this.clock.now().getTime() + challengeLifetimeMs),
    });
    try {
      await this.smsDelivery.sendPhoneVerification(input.phoneE164, code);
    } catch (error) {
      this.logDeliveryFailure('phone verification SMS', error);
      throw new AuthApplicationError('SMS_DELIVERY_UNAVAILABLE');
    }
    return { message: 'If the number can be verified, a code will be sent.' };
  }

  async verifyPhone(
    input: PhoneVerificationInput,
  ): Promise<{ message: string }> {
    const verified = await this.identity.verifyPhoneChallenge({
      userId: input.userId,
      phoneE164: input.phoneE164,
      codeHmac: this.crypto.hashPhoneCode(
        input.userId,
        input.phoneE164,
        input.code,
      ),
      now: this.clock.now(),
      maxAttempts: 5,
    });
    if (!verified) throw new AuthApplicationError('INVALID_PHONE_CHALLENGE');
    await this.identity.markPhoneVerified(
      input.userId,
      input.phoneE164,
      this.clock.now(),
    );
    return { message: 'Phone verified' };
  }

  /**
   * Records a delivery failure so an outage is visible to the operator, while
   * the caller-facing response stays uniform and discloses nothing about
   * whether an account exists. Only the error's type and message are logged —
   * never the token, code, or recipient (AGENTS.md:81).
   */
  private logDeliveryFailure(channel: string, error: unknown): void {
    const cause =
      error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
    this.authLogger.reportDeliveryFailure(
      `${channel} delivery failed (${cause})`,
    );
  }
}
