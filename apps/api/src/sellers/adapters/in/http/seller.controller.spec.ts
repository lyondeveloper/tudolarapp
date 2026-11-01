import { SellerController } from './seller.controller';
import type { SellerService } from '../../../application/seller.service';

function createMockService() {
  const getEligibility = jest.fn();
  const onboard = jest.fn();
  const getPublicProfile = jest.fn();
  const service = {
    getEligibility,
    onboard,
    getPublicProfile,
  } as unknown as SellerService;
  return { service, getEligibility, onboard, getPublicProfile };
}

describe('SellerController', () => {
  it('getMyEligibility delegates to service and returns DTO', async () => {
    const { service, getEligibility } = createMockService();
    getEligibility.mockResolvedValue({
      sellerId: 'user-1',
      state: 'eligible',
    });
    const controller = new SellerController(service);

    const result = await controller.getMyEligibility({
      userId: 'user-1',
      sessionId: 'sess-1',
    });
    expect(result).toEqual({ sellerId: 'user-1', state: 'eligible' });
    expect(getEligibility).toHaveBeenCalledWith('user-1');
  });

  it('onboard delegates to service and returns updated DTO', async () => {
    const { service, onboard } = createMockService();
    onboard.mockResolvedValue({
      sellerId: 'user-2',
      state: 'eligible',
    });
    const controller = new SellerController(service);

    const result = await controller.onboard({
      userId: 'user-2',
      sessionId: 'sess-2',
    });
    expect(result).toEqual({ sellerId: 'user-2', state: 'eligible' });
    expect(onboard).toHaveBeenCalledWith('user-2');
  });

  it('getPublicProfile delegates to service and returns public DTO', async () => {
    const { service, getPublicProfile } = createMockService();
    const joined = new Date('2026-10-20T00:00:00Z');
    getPublicProfile.mockResolvedValue({
      id: 'seller-3',
      displayName: 'Pedro Vendedor',
      state: 'eligible',
      memberSince: joined,
    });
    const controller = new SellerController(service);

    const result = await controller.getPublicProfile('seller-3');
    expect(result).toEqual({
      id: 'seller-3',
      displayName: 'Pedro Vendedor',
      state: 'eligible',
      memberSince: '2026-10-20T00:00:00.000Z',
    });
    expect(getPublicProfile).toHaveBeenCalledWith('seller-3');
  });
});
