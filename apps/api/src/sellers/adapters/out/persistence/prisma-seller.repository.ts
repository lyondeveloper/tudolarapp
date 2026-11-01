import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import type {
  PublicSellerProfile,
  SellerEligibilityPort,
} from '../../../application/sellers.ports';
import type {
  SellerEligibility,
  SellerEligibilityState,
} from '../../../domain/seller-eligibility';

/**
 * Concrete PostgreSQL/Prisma adapter for the seller eligibility and profile ports.
 * Selling is an earned state, never an account type (ADR-0016).
 */
@Injectable()
export class PrismaSellerRepository implements SellerEligibilityPort {
  constructor(private readonly prisma: PrismaService) {}

  async getEligibility(sellerId: string): Promise<SellerEligibility> {
    const row = await this.prisma.sellerEligibility.findUnique({
      where: { userId: sellerId },
    });
    if (!row) {
      return { sellerId, state: 'none' };
    }
    return {
      sellerId: row.userId,
      state: row.state as SellerEligibilityState,
    };
  }

  async saveEligibility(
    sellerId: string,
    state: SellerEligibilityState,
  ): Promise<SellerEligibility> {
    const saved = await this.prisma.sellerEligibility.upsert({
      where: { userId: sellerId },
      create: { userId: sellerId, state },
      update: { state },
    });
    return {
      sellerId: saved.userId,
      state: saved.state as SellerEligibilityState,
    };
  }

  async getPublicProfile(
    sellerId: string,
  ): Promise<PublicSellerProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerEligibility: true },
    });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      displayName: user.displayName,
      state:
        (user.sellerEligibility?.state as SellerEligibilityState) ?? 'none',
      memberSince: user.createdAt,
    };
  }
}
