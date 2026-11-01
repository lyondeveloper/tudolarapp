import { toSellerEligibilityDto, toPublicSellerProfileDto } from './seller.dto';

describe('seller.dto', () => {
  it('maps SellerEligibility domain to SellerEligibilityDto', () => {
    const dto = toSellerEligibilityDto({
      sellerId: 'user-1',
      state: 'eligible',
    });
    expect(dto).toEqual({ sellerId: 'user-1', state: 'eligible' });
  });

  it('maps PublicSellerProfile domain to PublicSellerProfileDto', () => {
    const joined = new Date('2026-10-15T12:00:00Z');
    const dto = toPublicSellerProfileDto({
      id: 'seller-1',
      displayName: 'Maria Vendedora',
      state: 'eligible',
      memberSince: joined,
    });
    expect(dto).toEqual({
      id: 'seller-1',
      displayName: 'Maria Vendedora',
      state: 'eligible',
      memberSince: '2026-10-15T12:00:00.000Z',
    });
  });
});
