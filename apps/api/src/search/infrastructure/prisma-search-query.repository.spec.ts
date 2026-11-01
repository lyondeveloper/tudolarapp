import { PrismaService } from '../../database/prisma.service';
import type { SearchCriteria } from '../domain/search-criteria';
import { PrismaSearchQueryRepository } from './prisma-search-query.repository';

describe('PrismaSearchQueryRepository', () => {
  let prisma: jest.Mocked<PrismaService>;
  let repository: PrismaSearchQueryRepository;
  const queryRawMock = jest.fn();

  beforeEach(() => {
    queryRawMock.mockReset();
    prisma = {
      $queryRaw: queryRawMock,
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaSearchQueryRepository(prisma);
  });

  const baseCriteria: SearchCriteria = {
    intent: 'search_offer',
    pairId: 'VES_USDT',
    amount: null,
    location: {
      hintText: 'CC Ojeda Mall',
      radiusKm: 5,
      latitude: 10.1969,
      longitude: -71.3081,
    },
    unresolved: [],
    confidence: { direction: 1, amount: 0, location: 1 },
  };

  it('queries active offers within radius and returns sorted cursor page', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        offerId: 'offer-1',
        distanceMeters: 120.5,
      },
      {
        offerId: 'offer-2',
        distanceMeters: 450.2,
      },
    ]);

    const result = await repository.search(
      baseCriteria,
      { limit: 10 },
      'ciudad-ojeda',
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0].offerId).toBe('offer-1');
    expect(result.items[0].distanceMeters).toBe(120.5);
    expect(result.items[1].offerId).toBe('offer-2');
    expect(result.items[1].distanceMeters).toBe(450.2);
    expect(queryRawMock).toHaveBeenCalled();
  });

  it('filters without coordinates when location is omitted', async () => {
    const noLocationCriteria: SearchCriteria = {
      ...baseCriteria,
      location: null,
    };

    queryRawMock.mockResolvedValueOnce([
      {
        offerId: 'offer-3',
        distanceMeters: null,
      },
    ]);

    const result = await repository.search(
      noLocationCriteria,
      { limit: 10 },
      'ciudad-ojeda',
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].offerId).toBe('offer-3');
    expect(result.items[0].distanceMeters).toBeNull();
  });
});
