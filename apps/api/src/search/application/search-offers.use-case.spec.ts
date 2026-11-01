import { Money } from '../../catalog/money';
import type { Offer } from '../../offers/domain/offer';
import type { OfferTermsVersion } from '../../offers/domain/offer-terms-version';
import type {
  OfferRepositoryPort,
  TermsVersionRepositoryPort,
} from '../../offers/application/offers.ports';
import type { SearchQueryPort } from './search.ports';
import {
  SearchOffersUseCase,
  SearchErrorCode,
  type SearchOffersCommand,
} from './search-offers.use-case';

describe('SearchOffersUseCase', () => {
  let searchQueryPort: jest.Mocked<SearchQueryPort>;
  let offerRepository: jest.Mocked<OfferRepositoryPort>;
  let termsVersionRepository: jest.Mocked<TermsVersionRepositoryPort>;
  let useCase: SearchOffersUseCase;

  const validOffer: Offer = {
    id: 'offer-1',
    marketId: 'ciudad-ojeda',
    sellerId: 'seller-1',
    status: 'active',
    description: 'Venta de bolivares en Ojeda',
    details: 'Feria de comida Ojeda Mall',
    currentTermsVersionId: 'terms-1',
    initialAmount: Money.of('1000.00', 'VES'),
    reservedAmount: Money.of('0.00', 'VES'),
    completedAmount: Money.of('0.00', 'VES'),
    availableAmount: Money.of('1000.00', 'VES'),
    location: { latitude: 10.1969, longitude: -71.3081 },
  };

  const validTerms: OfferTermsVersion = {
    id: 'terms-1',
    offerId: 'offer-1',
    version: 1,
    pairId: 'VES_USDT',
    giveAmount: Money.of('100.00', 'VES'),
    receiveAmount: Money.of('2.500000', 'USDT'),
    rate: '0.02500000',
    marginPct: '0.00',
    minAmount: Money.of('10.00', 'VES'),
    maxAmount: Money.of('500.00', 'VES'),
    expiresAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    searchQueryPort = {
      search: jest.fn().mockResolvedValue({
        items: [{ offerId: 'offer-1', distanceMeters: 150.0 }],
        nextCursor: null,
      }),
    };

    offerRepository = {
      findById: jest.fn().mockResolvedValue(validOffer),
      create: jest.fn(),
      pointAtCurrentVersion: jest.fn(),
    };

    termsVersionRepository = {
      current: jest.fn().mockResolvedValue(validTerms),
      append: jest.fn(),
    };

    useCase = new SearchOffersUseCase(
      searchQueryPort,
      offerRepository,
      termsVersionRepository,
    );
  });

  const validCommand: SearchOffersCommand = {
    marketId: 'ciudad-ojeda',
    pairId: 'VES_USDT',
    latitude: 10.1969,
    longitude: -71.3081,
    radiusKm: 5,
    limit: 10,
  };

  it('searches active offers and returns full offer items with calculated distance', async () => {
    const result = await useCase.execute(validCommand);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('offer-1');
    expect(result.items[0].distanceMeters).toBe(150.0);
    expect(result.items[0].pairId).toBe('VES_USDT');
    expect(result.items[0].terms.giveAmount).toBe('100.00');
    expect(result.items[0].location).toEqual({
      latitude: 10.1969,
      longitude: -71.3081,
    });
  });

  it('rejects invalid latitude', async () => {
    await expect(
      useCase.execute({
        ...validCommand,
        latitude: 95.0,
      }),
    ).rejects.toMatchObject({
      code: SearchErrorCode.INVALID_COORDINATES,
    });
  });

  it('rejects invalid longitude', async () => {
    await expect(
      useCase.execute({
        ...validCommand,
        longitude: -195.0,
      }),
    ).rejects.toMatchObject({
      code: SearchErrorCode.INVALID_COORDINATES,
    });
  });

  it('rejects unapproved catalog pair', async () => {
    await expect(
      useCase.execute({
        ...validCommand,
        pairId: 'VES_ZELLE',
      }),
    ).rejects.toMatchObject({
      code: SearchErrorCode.INVALID_PAIR,
    });
  });

  it('rejects radius exceeding maximum 50km', async () => {
    await expect(
      useCase.execute({
        ...validCommand,
        radiusKm: 60,
      }),
    ).rejects.toMatchObject({
      code: SearchErrorCode.INVALID_RADIUS,
    });
  });
});
