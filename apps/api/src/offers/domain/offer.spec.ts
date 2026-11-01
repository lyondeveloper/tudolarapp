import { Money } from '../../catalog/money';
import { createOffer, OfferError, type OfferStatus } from './offer';

describe('Offer domain entity', () => {
  const validPoint = { latitude: 10.1969, longitude: -71.3081 };
  const initialAmount = Money.of('100.00', 'VES');

  it('creates an offer with valid initial values', () => {
    const offer = createOffer({
      id: '11111111-1111-4111-8111-111111111111',
      marketId: 'ciudad-ojeda',
      sellerId: '22222222-2222-4222-8222-222222222222',
      status: 'active',
      description: 'Exchange VES for USDT',
      details: 'Meeting at CC Ojeda Mall',
      currentTermsVersionId: null,
      initialAmount,
      location: validPoint,
    });

    expect(offer.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(offer.marketId).toBe('ciudad-ojeda');
    expect(offer.sellerId).toBe('22222222-2222-4222-8222-222222222222');
    expect(offer.status).toBe('active');
    expect(offer.initialAmount.toDecimalString()).toBe('100.00');
    expect(offer.reservedAmount.toDecimalString()).toBe('0.00');
    expect(offer.completedAmount.toDecimalString()).toBe('0.00');
    expect(offer.availableAmount.toDecimalString()).toBe('100.00');
    expect(offer.location).toEqual(validPoint);
  });

  it('rejects an offer with non-positive initial amount', () => {
    expect(() =>
      createOffer({
        id: '11111111-1111-4111-8111-111111111111',
        marketId: 'ciudad-ojeda',
        sellerId: '22222222-2222-4222-8222-222222222222',
        status: 'active',
        description: 'Test',
        details: null,
        currentTermsVersionId: null,
        initialAmount: Money.of('0.00', 'VES'),
        location: validPoint,
      }),
    ).toThrow(OfferError);
  });

  it('rejects an offer with invalid status', () => {
    expect(() =>
      createOffer({
        id: '11111111-1111-4111-8111-111111111111',
        marketId: 'ciudad-ojeda',
        sellerId: '22222222-2222-4222-8222-222222222222',
        status: 'invalid_status' as OfferStatus,
        description: 'Test',
        details: null,
        currentTermsVersionId: null,
        initialAmount,
        location: validPoint,
      }),
    ).toThrow(OfferError);
  });

  it('rejects coordinates with latitude outside [-90, 90]', () => {
    expect(() =>
      createOffer({
        id: '11111111-1111-4111-8111-111111111111',
        marketId: 'ciudad-ojeda',
        sellerId: '22222222-2222-4222-8222-222222222222',
        status: 'active',
        description: 'Test',
        details: null,
        currentTermsVersionId: null,
        initialAmount,
        location: { latitude: 95.0, longitude: -71.3 },
      }),
    ).toThrow(OfferError);
  });

  it('rejects coordinates with longitude outside [-180, 180]', () => {
    expect(() =>
      createOffer({
        id: '11111111-1111-4111-8111-111111111111',
        marketId: 'ciudad-ojeda',
        sellerId: '22222222-2222-4222-8222-222222222222',
        status: 'active',
        description: 'Test',
        details: null,
        currentTermsVersionId: null,
        initialAmount,
        location: { latitude: 10.0, longitude: -185.0 },
      }),
    ).toThrow(OfferError);
  });

  it('rejects when reserved plus completed exceeds initial amount', () => {
    expect(() =>
      createOffer({
        id: '11111111-1111-4111-8111-111111111111',
        marketId: 'ciudad-ojeda',
        sellerId: '22222222-2222-4222-8222-222222222222',
        status: 'active',
        description: 'Test',
        details: null,
        currentTermsVersionId: null,
        initialAmount,
        reservedAmount: Money.of('60.00', 'VES'),
        completedAmount: Money.of('50.00', 'VES'),
        location: validPoint,
      }),
    ).toThrow(OfferError);
  });
});
