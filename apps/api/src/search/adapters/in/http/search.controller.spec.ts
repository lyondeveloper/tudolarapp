import { BadRequestException } from '@nestjs/common';
import {
  SearchOffersUseCase,
  SearchError,
  SearchErrorCode,
} from '../../../application/search-offers.use-case';
import { SearchController } from './search.controller';
import type { SearchOffersQueryDto } from './search-offers.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let useCase: jest.Mocked<SearchOffersUseCase>;

  beforeEach(() => {
    useCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SearchOffersUseCase>;

    controller = new SearchController(useCase);
  });

  const query: SearchOffersQueryDto = {
    pairId: 'VES_USDT',
    latitude: 10.1969,
    longitude: -71.3081,
    radiusKm: 5,
    limit: 10,
  };

  it('returns paginated search offers from the use case', async () => {
    const mockResult = {
      items: [
        {
          id: 'offer-1',
          pairId: 'VES_USDT' as const,
          distanceMeters: 120.5,
          status: 'active' as const,
          description: 'Venta de bolivares',
          details: 'Ojeda Mall',
          location: { latitude: 10.1969, longitude: -71.3081 },
          currentTermsVersionId: 'terms-1',
          terms: {
            version: 1,
            giveAmount: '100.00',
            receiveAmount: '2.500000',
            rate: '0.02500000',
            marginPct: '0.00',
            minAmount: '10.00',
            maxAmount: '500.00',
            expiresAt: new Date().toISOString(),
          },
        },
      ],
      nextCursor: null,
    };

    useCase.execute.mockResolvedValueOnce(mockResult);

    const executeSpy = jest.spyOn(useCase, 'execute');

    const response = await controller.searchOffers('ciudad-ojeda', query);

    expect(response.items).toHaveLength(1);
    expect(response.items[0].id).toBe('offer-1');
    expect(response.items[0].distanceMeters).toBe(120.5);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        marketId: 'ciudad-ojeda',
        pairId: 'VES_USDT',
        latitude: 10.1969,
        longitude: -71.3081,
      }),
    );
  });

  it('translates SearchError into BadRequestException', async () => {
    useCase.execute.mockRejectedValueOnce(
      new SearchError(
        'Invalid coordinates',
        SearchErrorCode.INVALID_COORDINATES,
      ),
    );

    await expect(
      controller.searchOffers('ciudad-ojeda', query),
    ).rejects.toThrow(BadRequestException);
  });
});
