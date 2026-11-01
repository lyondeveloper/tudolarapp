import { ApplicationError } from '../../common/errors/application-error';
import { ApiErrorCode } from '../../common/errors/api-error-code';
import type { IdentityRepositoryPort } from '../../auth/application/auth.ports';
import type { SellerEligibilityPort } from './sellers.ports';
import { SellerService } from './seller.service';

function createMocks() {
  const getEligibility = jest.fn();
  const saveEligibility = jest.fn();
  const getPublicProfile = jest.fn();
  const sellerRepo = {
    getEligibility,
    saveEligibility,
    getPublicProfile,
  } as unknown as SellerEligibilityPort;

  const findById = jest.fn();
  const identityRepo = {
    findById,
  } as unknown as IdentityRepositoryPort;

  return {
    sellerRepo,
    identityRepo,
    getEligibility,
    saveEligibility,
    getPublicProfile,
    findById,
  };
}

describe('SellerService', () => {
  it('returns current eligibility for seller', async () => {
    const { sellerRepo, identityRepo, getEligibility } = createMocks();
    getEligibility.mockResolvedValue({
      sellerId: 'user-1',
      state: 'eligible',
    });
    const service = new SellerService(sellerRepo, identityRepo);

    const result = await service.getEligibility('user-1');
    expect(result).toEqual({ sellerId: 'user-1', state: 'eligible' });
  });

  it('rejects onboarding with USER_NOT_FOUND if user does not exist', async () => {
    const { sellerRepo, identityRepo, findById } = createMocks();
    findById.mockResolvedValue(null);
    const service = new SellerService(sellerRepo, identityRepo);

    await expect(service.onboard('unknown-user')).rejects.toThrow(
      new ApplicationError(ApiErrorCode.USER_NOT_FOUND),
    );
  });

  it('rejects onboarding with EMAIL_NOT_VERIFIED if user email is not verified', async () => {
    const { sellerRepo, identityRepo, findById } = createMocks();
    findById.mockResolvedValue({
      id: 'user-unverified',
      displayName: 'User',
      username: 'user',
      email: 'user@example.com',
      emailVerifiedAt: null,
      phoneE164: null,
      phoneVerifiedAt: null,
      passwordHash: 'hash',
      accountStatus: 'active',
      authMethods: ['password'],
    });
    const service = new SellerService(sellerRepo, identityRepo);

    await expect(service.onboard('user-unverified')).rejects.toThrow(
      new ApplicationError(ApiErrorCode.EMAIL_NOT_VERIFIED),
    );
  });

  it('successfully onboards user and saves eligibility state as eligible when verified', async () => {
    const { sellerRepo, identityRepo, findById, saveEligibility } =
      createMocks();
    findById.mockResolvedValue({
      id: 'user-verified',
      displayName: 'User',
      username: 'user',
      email: 'user@example.com',
      emailVerifiedAt: new Date(),
      phoneE164: null,
      phoneVerifiedAt: null,
      passwordHash: 'hash',
      accountStatus: 'active',
      authMethods: ['password'],
    });
    saveEligibility.mockResolvedValue({
      sellerId: 'user-verified',
      state: 'eligible',
    });
    const service = new SellerService(sellerRepo, identityRepo);

    const result = await service.onboard('user-verified');
    expect(result).toEqual({ sellerId: 'user-verified', state: 'eligible' });
    expect(saveEligibility).toHaveBeenCalledWith('user-verified', 'eligible');
  });

  it('returns public profile when found', async () => {
    const { sellerRepo, identityRepo, getPublicProfile } = createMocks();
    const joined = new Date();
    getPublicProfile.mockResolvedValue({
      id: 'seller-1',
      displayName: 'Seller',
      state: 'eligible',
      memberSince: joined,
    });
    const service = new SellerService(sellerRepo, identityRepo);

    const profile = await service.getPublicProfile('seller-1');
    expect(profile).toEqual({
      id: 'seller-1',
      displayName: 'Seller',
      state: 'eligible',
      memberSince: joined,
    });
  });

  it('throws NOT_FOUND when public profile does not exist', async () => {
    const { sellerRepo, identityRepo, getPublicProfile } = createMocks();
    getPublicProfile.mockResolvedValue(null);
    const service = new SellerService(sellerRepo, identityRepo);

    await expect(service.getPublicProfile('unknown')).rejects.toThrow(
      new ApplicationError(ApiErrorCode.NOT_FOUND),
    );
  });
});
