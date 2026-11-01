import type { PrismaService } from '../../../../database/prisma.service';
import { PrismaSellerRepository } from './prisma-seller.repository';

function createFakePrisma() {
  const sellerEligibility = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  };
  const user = {
    findUnique: jest.fn(),
  };
  const prisma = {
    sellerEligibility,
    user,
  };
  return {
    prisma: prisma as unknown as PrismaService,
    sellerEligibility,
    user,
  };
}

describe('PrismaSellerRepository', () => {
  it('returns eligibility none when no seller eligibility row exists', async () => {
    const { prisma, sellerEligibility } = createFakePrisma();
    sellerEligibility.findUnique.mockResolvedValue(null);
    const repo = new PrismaSellerRepository(prisma);

    const eligibility = await repo.getEligibility('user-1');
    expect(eligibility).toEqual({ sellerId: 'user-1', state: 'none' });
    expect(sellerEligibility.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('returns stored eligibility when row exists', async () => {
    const { prisma, sellerEligibility } = createFakePrisma();
    sellerEligibility.findUnique.mockResolvedValue({
      userId: 'user-2',
      state: 'eligible',
    });
    const repo = new PrismaSellerRepository(prisma);

    const eligibility = await repo.getEligibility('user-2');
    expect(eligibility).toEqual({ sellerId: 'user-2', state: 'eligible' });
  });

  it('upserts seller eligibility when saving', async () => {
    const { prisma, sellerEligibility } = createFakePrisma();
    sellerEligibility.upsert.mockResolvedValue({
      userId: 'user-3',
      state: 'eligible',
    });
    const repo = new PrismaSellerRepository(prisma);

    const result = await repo.saveEligibility('user-3', 'eligible');
    expect(result).toEqual({ sellerId: 'user-3', state: 'eligible' });
    expect(sellerEligibility.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-3' },
      create: { userId: 'user-3', state: 'eligible' },
      update: { state: 'eligible' },
    });
  });

  it('returns public profile omitting private PII', async () => {
    const { prisma, user } = createFakePrisma();
    const joinedDate = new Date('2026-10-01T12:00:00Z');
    user.findUnique.mockResolvedValue({
      id: 'user-4',
      displayName: 'Carlos Vendedor',
      email: 'carlos@secret.com',
      phoneE164: '+584141234567',
      passwordHash: 'argon2id$secret',
      createdAt: joinedDate,
      sellerEligibility: { state: 'eligible' },
    });
    const repo = new PrismaSellerRepository(prisma);

    const profile = await repo.getPublicProfile('user-4');
    expect(profile).toEqual({
      id: 'user-4',
      displayName: 'Carlos Vendedor',
      state: 'eligible',
      memberSince: joinedDate,
    });
    expect((profile as Record<string, unknown>).email).toBeUndefined();
    expect((profile as Record<string, unknown>).phoneE164).toBeUndefined();
    expect((profile as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('returns null for public profile when user does not exist', async () => {
    const { prisma, user } = createFakePrisma();
    user.findUnique.mockResolvedValue(null);
    const repo = new PrismaSellerRepository(prisma);

    const profile = await repo.getPublicProfile('unknown-user');
    expect(profile).toBeNull();
  });
});
