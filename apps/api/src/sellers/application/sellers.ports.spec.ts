import { SELLER_ELIGIBILITY_PORT } from './sellers.ports';

describe('sellers.ports', () => {
  it('exports SELLER_ELIGIBILITY_PORT as a unique symbol', () => {
    expect(typeof SELLER_ELIGIBILITY_PORT).toBe('symbol');
    expect(SELLER_ELIGIBILITY_PORT.toString()).toContain(
      'SELLER_ELIGIBILITY_PORT',
    );
  });
});
