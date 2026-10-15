import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import type {
  AuthChallengePurpose,
  AuthChallengeRecord,
  AuthSessionRecord,
  CreatePasswordAccount,
  EmailActionPurpose,
  IdentityRepositoryPort,
  PasswordAccount,
} from '../../../application/auth.ports';
import type {
  AccountStatus,
  PasskeyCredential,
  User,
} from '../../../domain/user';

type UserFields = {
  id: string;
  displayName: string;
  username: string | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  phoneE164: string | null;
  phoneVerifiedAt: Date | null;
  accountStatus: string;
  createdAt: Date;
  passwordHash?: string | null;
};

type UserWithPasskeyCount = UserFields & {
  _count: { passkeyCredentials: number };
};

type SessionFields = {
  id: string;
  userId: string;
  tokenFamilyId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

function mapUser(row: UserFields): User {
  return {
    id: row.id,
    displayName: row.displayName,
    username: row.username,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    phoneE164: row.phoneE164,
    phoneVerifiedAt: row.phoneVerifiedAt,
    accountStatus: row.accountStatus as AccountStatus,
    createdAt: row.createdAt,
  };
}

function mapPasswordAccount(row: UserWithPasskeyCount): PasswordAccount {
  return {
    ...mapUser(row),
    passwordHash: row.passwordHash ?? null,
    authMethods: [
      ...(row.passwordHash ? (['password'] as const) : []),
      ...(row._count.passkeyCredentials > 0 ? (['passkey'] as const) : []),
    ],
  };
}

function mapSession(row: SessionFields): AuthSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenFamilyId: row.tokenFamilyId,
    refreshTokenHash: row.refreshTokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PrismaIdentityRepository implements IdentityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdentifier(identifier: string): Promise<PasswordAccount | null> {
    const normalized = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { usernameNormalized: normalized },
          { emailNormalized: normalized },
        ],
      },
      include: { _count: { select: { passkeyCredentials: true } } },
    });
    return user ? mapPasswordAccount(user) : null;
  }

  async findById(userId: string): Promise<PasswordAccount | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { passkeyCredentials: true } } },
    });
    return user ? mapPasswordAccount(user) : null;
  }

  async createPasswordAccount(input: CreatePasswordAccount): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            displayName: input.displayName,
            username: input.username,
            usernameNormalized: input.usernameNormalized,
            email: input.email,
            emailNormalized: input.emailNormalized,
            passwordHash: input.passwordHash,
            accountStatus: 'pending_email',
          },
          select: { id: true },
        });
        await tx.emailActionToken.create({
          data: {
            userId: user.id,
            purpose: 'verify_email',
            tokenHash: input.emailTokenHash,
            expiresAt: input.emailTokenExpiresAt,
          },
        });
      });
      return true;
    } catch (error) {
      // Replaces the previous `ON CONFLICT DO NOTHING`: registering again with
      // a taken username/email is accepted silently so the API does not
      // disclose whether an account exists.
      if (isUniqueConstraintViolation(error)) return false;
      throw error;
    }
  }

  async findPasskeyByCredentialId(credentialId: string): Promise<{
    user: User;
    credential: PasskeyCredential;
  } | null> {
    const row = await this.prisma.passkeyCredential.findUnique({
      where: { credentialId },
      include: { user: true },
    });
    if (!row) return null;
    return {
      user: mapUser(row.user),
      credential: {
        id: row.id,
        userId: row.userId,
        credentialId: row.credentialId,
        publicKey: new Uint8Array(row.publicKey),
        signatureCounter: Number(row.signatureCounter),
        transports: row.transports,
        deviceType: row.deviceType,
        backedUp: row.backedUp,
      },
    };
  }

  async updatePasskeyCounter(
    credentialId: string,
    counter: number,
  ): Promise<void> {
    // `GREATEST` has no Prisma equivalent, and this update must stay atomic:
    // a signature counter that can be rolled back weakens WebAuthn replay
    // detection.
    await this.prisma.$executeRaw`
      UPDATE passkey_credentials
      SET signature_counter = GREATEST(signature_counter, ${BigInt(counter)}),
          last_used_at = now()
      WHERE credential_id = ${credentialId}
    `;
  }

  async createAuthChallenge(input: {
    purpose: AuthChallengePurpose;
    challenge: string;
    userId?: string;
    context?: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<string> {
    const challenge = await this.prisma.authChallenge.create({
      data: {
        purpose: input.purpose,
        challenge: input.challenge,
        userId: input.userId ?? null,
        context: (input.context ?? {}) as Prisma.InputJsonValue,
        expiresAt: input.expiresAt,
      },
      select: { id: true },
    });
    return challenge.id;
  }

  async getAuthChallenge(
    id: string,
    purpose: AuthChallengePurpose,
  ): Promise<AuthChallengeRecord | null> {
    const row = await this.prisma.authChallenge.findFirst({
      where: {
        id,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return row
      ? {
          id: row.id,
          purpose: row.purpose as AuthChallengePurpose,
          challenge: row.challenge,
          userId: row.userId,
          context: (row.context ?? {}) as Record<string, unknown>,
          expiresAt: row.expiresAt,
        }
      : null;
  }

  async completePasskeyRegistration(input: {
    challengeId: string;
    challenge: string;
    userId: string;
    displayName: string;
    credential: Omit<PasskeyCredential, 'id' | 'userId'>;
    now: Date;
  }): Promise<User | null> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authChallenge.updateMany({
        where: {
          id: input.challengeId,
          purpose: 'passkey_registration',
          challenge: input.challenge,
          consumedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { consumedAt: input.now },
      });
      if (consumed.count === 0) return null;

      const user = await tx.user.create({
        data: {
          id: input.userId,
          displayName: input.displayName,
          accountStatus: 'active',
        },
      });
      await tx.passkeyCredential.create({
        data: this.passkeyData(input.userId, input.credential),
      });
      return mapUser(user);
    });
  }

  async completePasskeyEnrollment(input: {
    challengeId: string;
    challenge: string;
    userId: string;
    credential: Omit<PasskeyCredential, 'id' | 'userId'>;
    now: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authChallenge.updateMany({
        where: {
          id: input.challengeId,
          purpose: 'passkey_registration',
          userId: input.userId,
          challenge: input.challenge,
          consumedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { consumedAt: input.now },
      });
      if (consumed.count === 0) return false;

      await tx.passkeyCredential.create({
        data: this.passkeyData(input.userId, input.credential),
      });
      return true;
    });
  }

  async consumeAuthChallenge(
    id: string,
    purpose: AuthChallengePurpose,
    now: Date,
  ): Promise<boolean> {
    const consumed = await this.prisma.authChallenge.updateMany({
      where: { id, purpose, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    return consumed.count > 0;
  }

  async createEmailAction(input: {
    userId: string;
    purpose: EmailActionPurpose;
    tokenHash: string;
    expiresAt: Date;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.emailActionToken.updateMany({
        where: {
          userId: input.userId,
          purpose: input.purpose,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      await tx.emailActionToken.create({
        data: {
          userId: input.userId,
          purpose: input.purpose,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          context: (input.context ?? {}) as Prisma.InputJsonValue,
        },
      });
    });
  }

  async completeEmailVerification(
    tokenHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Consuming the token first is an atomic compare-and-swap: two concurrent
      // verifications of the same token cannot both succeed.
      const consumed = await tx.emailActionToken.updateMany({
        where: {
          tokenHash,
          purpose: { in: ['verify_email', 'add_password'] },
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (consumed.count === 0) return false;

      const token = await tx.emailActionToken.findUnique({
        where: { tokenHash },
        select: { userId: true, context: true },
      });
      if (!token) return false;

      const context = (token.context ?? {}) as Record<string, unknown>;
      const text = (key: string): string | null => {
        const value = context[key];
        return typeof value === 'string' ? value : null;
      };

      const current = await tx.user.findUnique({
        where: { id: token.userId },
        select: { accountStatus: true },
      });
      if (!current) return false;

      await tx.user.update({
        where: { id: token.userId },
        data: {
          // `undefined` leaves the column untouched, matching the COALESCE
          // semantics of the previous SQL implementation.
          email: text('email') ?? undefined,
          emailNormalized: text('emailNormalized') ?? undefined,
          username: text('username') ?? undefined,
          usernameNormalized: text('usernameNormalized') ?? undefined,
          passwordHash: text('passwordHash') ?? undefined,
          emailVerifiedAt: now,
          accountStatus:
            current.accountStatus === 'pending_email'
              ? 'active'
              : current.accountStatus,
          updatedAt: now,
        },
      });
      return true;
    });
  }

  async resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailActionToken.updateMany({
        where: {
          tokenHash,
          purpose: 'password_reset',
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (consumed.count === 0) return null;

      const token = await tx.emailActionToken.findUnique({
        where: { tokenHash },
        select: { userId: true },
      });
      if (!token) return null;

      const user = await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, updatedAt: now },
        select: { email: true },
      });
      await tx.authSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return user.email;
    });
  }

  async createPhoneChallenge(input: {
    userId: string;
    phoneE164: string;
    codeHmac: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.phoneVerificationChallenge.updateMany({
        where: {
          userId: input.userId,
          phoneE164: input.phoneE164,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      await tx.phoneVerificationChallenge.create({
        data: {
          userId: input.userId,
          phoneE164: input.phoneE164,
          codeHmac: input.codeHmac,
          expiresAt: input.expiresAt,
        },
      });
    });
  }

  async verifyPhoneChallenge(input: {
    userId: string;
    phoneE164: string;
    codeHmac: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.phoneVerificationChallenge.findFirst({
        where: {
          userId: input.userId,
          phoneE164: input.phoneE164,
          consumedAt: null,
          expiresAt: { gt: input.now },
          attempts: { lt: input.maxAttempts },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, codeHmac: true },
      });
      if (!challenge) return false;

      if (challenge.codeHmac !== input.codeHmac) {
        // `increment` compiles to `attempts = attempts + 1`, so concurrent
        // failed attempts cannot lose an increment.
        await tx.phoneVerificationChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        return false;
      }
      await tx.phoneVerificationChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: input.now },
      });
      return true;
    });
  }

  async markPhoneVerified(
    userId: string,
    phoneE164: string,
    verifiedAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneE164,
        phoneVerifiedAt: verifiedAt,
        updatedAt: new Date(),
      },
    });
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenFamilyId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        id: input.id,
        userId: input.userId,
        tokenFamilyId: input.tokenFamilyId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findSessionByRefreshHash(
    hash: string,
  ): Promise<AuthSessionRecord | null> {
    const row = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: hash },
    });
    return row ? mapSession(row) : null;
  }

  async rotateSession(input: {
    sessionId: string;
    oldHash: string;
    newSessionId: string;
    newHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Atomic compare-and-swap in place of `SELECT ... FOR UPDATE`: exactly one
      // concurrent refresh can revoke the presented token. Any loser is treated
      // as replay and revokes the whole token family.
      const revoked = await tx.authSession.updateMany({
        where: {
          id: input.sessionId,
          refreshTokenHash: input.oldHash,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: {
          revokedAt: input.now,
          replacedBySessionId: input.newSessionId,
          lastUsedAt: input.now,
        },
      });

      const session = await tx.authSession.findFirst({
        where: { id: input.sessionId, refreshTokenHash: input.oldHash },
        select: { userId: true, tokenFamilyId: true },
      });
      if (!session) return false;

      if (revoked.count === 0) {
        await tx.authSession.updateMany({
          where: { tokenFamilyId: session.tokenFamilyId, revokedAt: null },
          data: { revokedAt: input.now },
        });
        return false;
      }

      await tx.authSession.create({
        data: {
          id: input.newSessionId,
          userId: session.userId,
          tokenFamilyId: session.tokenFamilyId,
          refreshTokenHash: input.newHash,
          expiresAt: input.expiresAt,
        },
      });
      return true;
    });
  }

  async revokeSession(
    sessionId: string,
    userId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async revokeSessionFamily(
    tokenFamilyId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { tokenFamilyId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async revokeUserSessions(userId: string, revokedAt: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  private passkeyData(
    userId: string,
    credential: Omit<PasskeyCredential, 'id' | 'userId'>,
  ): Prisma.PasskeyCredentialUncheckedCreateInput {
    return {
      userId,
      credentialId: credential.credentialId,
      publicKey: Buffer.from(credential.publicKey),
      signatureCounter: BigInt(credential.signatureCounter),
      transports: credential.transports,
      deviceType: credential.deviceType,
      backedUp: credential.backedUp,
    };
  }
}
