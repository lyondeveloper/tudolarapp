import type { PrismaService } from '../../../../database/prisma.service';
import { PrismaIdentityRepository } from './prisma-identity.repository';

function createFakePrisma() {
  const tx = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passkeyCredential: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    authChallenge: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    emailActionToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    phoneVerificationChallenge: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    authSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const prisma = {
    ...tx,
    $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
    $executeRaw: jest.fn(),
  };

  return { prisma: prisma as unknown as PrismaService, tx };
}

describe('PrismaIdentityRepository', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');

  describe('mapping boundaries', () => {
    it('maps findById to PasswordAccount without exposing ORM-only fields', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Maria',
        username: 'Maria_V',
        usernameNormalized: 'maria_v',
        email: 'Maria@Example.com',
        emailNormalized: 'maria@example.com',
        emailVerifiedAt: now,
        passwordHash: 'argon2$hash',
        phoneE164: '+584121234567',
        phoneVerifiedAt: now,
        accountStatus: 'active',
        createdAt: now,
        updatedAt: now,
        _count: { passkeyCredentials: 2 },
      });

      const repo = new PrismaIdentityRepository(prisma);
      const account = await repo.findById('user-1');

      expect(account).toEqual({
        id: 'user-1',
        displayName: 'Maria',
        username: 'Maria_V',
        email: 'Maria@Example.com',
        emailVerifiedAt: now,
        phoneE164: '+584121234567',
        phoneVerifiedAt: now,
        accountStatus: 'active',
        createdAt: now,
        passwordHash: 'argon2$hash',
        authMethods: ['password', 'passkey'],
      });
      expect(account).not.toHaveProperty('usernameNormalized');
      expect(account).not.toHaveProperty('emailNormalized');
      expect(account).not.toHaveProperty('updatedAt');
      expect(account).not.toHaveProperty('_count');
    });

    it('maps findSessionByRefreshHash to AuthSessionRecord without exposing ORM fields', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.authSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        tokenFamilyId: 'fam-1',
        refreshTokenHash: 'hash-1',
        expiresAt: now,
        revokedAt: null,
        replacedBySessionId: 'sess-2',
        lastUsedAt: now,
        createdAt: now,
      });

      const repo = new PrismaIdentityRepository(prisma);
      const session = await repo.findSessionByRefreshHash('hash-1');

      expect(session).toEqual({
        id: 'sess-1',
        userId: 'user-1',
        tokenFamilyId: 'fam-1',
        refreshTokenHash: 'hash-1',
        expiresAt: now,
        revokedAt: null,
      });
      expect(session).not.toHaveProperty('replacedBySessionId');
      expect(session).not.toHaveProperty('lastUsedAt');
      expect(session).not.toHaveProperty('createdAt');
    });
  });

  describe('consumeAuthChallenge', () => {
    it('executes a guarded updateMany and returns false when zero rows match', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.authChallenge.updateMany.mockResolvedValue({ count: 0 });

      const repo = new PrismaIdentityRepository(prisma);
      const consumed = await repo.consumeAuthChallenge(
        'chal-1',
        'passkey_authentication',
        now,
      );

      expect(consumed).toBe(false);
      expect(tx.authChallenge.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'chal-1',
          purpose: 'passkey_authentication',
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
    });
  });

  describe('completeEmailVerification', () => {
    it('guards updateMany on tokenHash, purpose, consumedAt: null, and expiresAt > now, aborting on 0 rows', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.emailActionToken.updateMany.mockResolvedValue({ count: 0 });

      const repo = new PrismaIdentityRepository(prisma);
      const result = await repo.completeEmailVerification('token-hash-1', now);

      expect(result).toBe(false);
      expect(tx.emailActionToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: 'token-hash-1',
          purpose: { in: ['verify_email', 'add_password'] },
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('guards updateMany on password_reset token and revokes active sessions on success', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.emailActionToken.updateMany.mockResolvedValue({ count: 0 });

      const repo = new PrismaIdentityRepository(prisma);
      const failed = await repo.resetPassword('reset-hash', 'new-pw-hash', now);

      expect(failed).toBeNull();
      expect(tx.emailActionToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: 'reset-hash',
          purpose: 'password_reset',
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyPhoneChallenge', () => {
    it('guards consumption on id, consumedAt: null, expiresAt > now, attempts < maxAttempts, and codeHmac, and increments attempts on mismatch', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.phoneVerificationChallenge.findFirst.mockResolvedValue({
        id: 'phone-chal-1',
      });
      tx.phoneVerificationChallenge.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 });

      const repo = new PrismaIdentityRepository(prisma);
      const verified = await repo.verifyPhoneChallenge({
        userId: 'user-1',
        phoneE164: '+584121234567',
        codeHmac: 'wrong-hmac',
        now,
        maxAttempts: 5,
      });

      expect(verified).toBe(false);
      expect(tx.phoneVerificationChallenge.updateMany).toHaveBeenNthCalledWith(
        1,
        {
          where: {
            id: 'phone-chal-1',
            consumedAt: null,
            expiresAt: { gt: now },
            attempts: { lt: 5 },
            codeHmac: 'wrong-hmac',
          },
          data: { consumedAt: now },
        },
      );
      expect(tx.phoneVerificationChallenge.updateMany).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            id: 'phone-chal-1',
            consumedAt: null,
            expiresAt: { gt: now },
            attempts: { lt: 5 },
          },
          data: { attempts: { increment: 1 } },
        },
      );
    });
  });

  describe('rotateSession', () => {
    it('guards session revocation with compare-and-swap and revokes the entire token family when 0 rows match', async () => {
      const { prisma, tx } = createFakePrisma();
      tx.authSession.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 2 });
      tx.authSession.findFirst.mockResolvedValue({
        userId: 'user-1',
        tokenFamilyId: 'fam-1',
      });

      const repo = new PrismaIdentityRepository(prisma);
      const rotated = await repo.rotateSession({
        sessionId: 'sess-1',
        oldHash: 'old-hash',
        newSessionId: 'sess-2',
        newHash: 'new-hash',
        expiresAt: new Date('2026-11-01T00:00:00.000Z'),
        now,
      });

      expect(rotated).toBe(false);
      expect(tx.authSession.updateMany).toHaveBeenNthCalledWith(1, {
        where: {
          id: 'sess-1',
          refreshTokenHash: 'old-hash',
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
          replacedBySessionId: 'sess-2',
          lastUsedAt: now,
        },
      });
      expect(tx.authSession.updateMany).toHaveBeenNthCalledWith(2, {
        where: { tokenFamilyId: 'fam-1', revokedAt: null },
        data: { revokedAt: now },
      });
      expect(tx.authSession.create).not.toHaveBeenCalled();
    });
  });
});
