import { Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import { IDENTITY_REPOSITORY } from '../../auth/application/auth.tokens';
import type { IdentityRepositoryPort } from '../../auth/application/auth.ports';
import {
  SELLER_ELIGIBILITY_PORT,
  type PublicSellerProfile,
  type SellerEligibilityPort,
} from './sellers.ports';
import type { SellerEligibility } from '../domain/seller-eligibility';

@Injectable()
export class SellerService {
  constructor(
    @Inject(SELLER_ELIGIBILITY_PORT)
    private readonly sellerRepo: SellerEligibilityPort,
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepo: IdentityRepositoryPort,
  ) {}

  async getEligibility(sellerId: string): Promise<SellerEligibility> {
    return this.sellerRepo.getEligibility(sellerId);
  }

  async onboard(userId: string): Promise<SellerEligibility> {
    const user = await this.identityRepo.findById(userId);
    if (!user) {
      throw new ApplicationError(ApiErrorCode.USER_NOT_FOUND);
    }
    if (!user.emailVerifiedAt) {
      throw new ApplicationError(ApiErrorCode.EMAIL_NOT_VERIFIED);
    }
    return this.sellerRepo.saveEligibility(userId, 'eligible');
  }

  async getPublicProfile(sellerId: string): Promise<PublicSellerProfile> {
    const profile = await this.sellerRepo.getPublicProfile(sellerId);
    if (!profile) {
      throw new ApplicationError(ApiErrorCode.NOT_FOUND);
    }
    return profile;
  }
}
