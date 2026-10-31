import type { Market } from '../domain/market';
import {
  MARKET_REPOSITORY,
  MarketPoint,
  MarketRepositoryPort,
} from './markets.ports';

describe('MarketRepositoryPort contract', () => {
  it('defines the MARKET_REPOSITORY symbol token', () => {
    expect(typeof MARKET_REPOSITORY).toBe('symbol');
    expect(MARKET_REPOSITORY.description).toBe('MARKET_REPOSITORY');
  });

  it('can be implemented by an adapter satisfying all port methods', async () => {
    const mockMarket: Market = {
      id: 'ciudad-ojeda',
      name: 'Ciudad Ojeda',
      description: 'Pilot market',
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-71.35, 10.15],
            [-71.25, 10.15],
            [-71.25, 10.25],
            [-71.35, 10.25],
            [-71.35, 10.15],
          ],
        ],
      },
      isActive: true,
      attribution: '© OpenStreetMap contributors',
    };

    const repository: MarketRepositoryPort = {
      exists: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue(mockMarket),
      findAllActive: jest.fn().mockResolvedValue([mockMarket]),
      containsPoint: jest
        .fn()
        .mockImplementation((_marketId: string, point: MarketPoint) =>
          Promise.resolve(
            point.longitude >= -71.35 &&
              point.longitude <= -71.25 &&
              point.latitude >= 10.15 &&
              point.latitude <= 10.25,
          ),
        ),
    };

    expect(await repository.exists('ciudad-ojeda')).toBe(true);
    expect(await repository.findById('ciudad-ojeda')).toEqual(mockMarket);

    const activeMarkets = await repository.findAllActive();
    expect(activeMarkets).toHaveLength(1);
    expect(activeMarkets[0].id).toBe('ciudad-ojeda');

    const insidePoint: MarketPoint = { longitude: -71.3, latitude: 10.2 };
    const outsidePoint: MarketPoint = { longitude: -70.0, latitude: 12.0 };

    expect(await repository.containsPoint('ciudad-ojeda', insidePoint)).toBe(
      true,
    );
    expect(await repository.containsPoint('ciudad-ojeda', outsidePoint)).toBe(
      false,
    );
  });
});
