import type { PrismaService } from '../../../../database/prisma.service';
import type { MarketPoint } from '../../../application/markets.ports';
import { PrismaMarketRepository } from './prisma-market.repository';

function createFakePrisma() {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  return { prisma: prisma as unknown as PrismaService };
}

describe('PrismaMarketRepository', () => {
  it('exists returns true when the market exists and is active', async () => {
    const { prisma } = createFakePrisma();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ exists: true }]);
    const repo = new PrismaMarketRepository(prisma);

    const exists = await repo.exists('ciudad-ojeda');
    expect(exists).toBe(true);
  });

  it('exists returns false when market is not found or inactive', async () => {
    const { prisma } = createFakePrisma();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ exists: false }]);
    const repo = new PrismaMarketRepository(prisma);

    const exists = await repo.exists('unknown-market');
    expect(exists).toBe(false);
  });

  it('findById returns Market domain model with parsed GeoJSON boundary', async () => {
    const { prisma } = createFakePrisma();
    const fakeGeoJson = JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-71.36, 10.16],
          [-71.33, 10.26],
          [-71.22, 10.26],
          [-71.18, 10.16],
          [-71.28, 10.1],
          [-71.36, 10.16],
        ],
      ],
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        id: 'ciudad-ojeda',
        name: 'Ciudad Ojeda',
        description: 'Pilot market',
        is_active: true,
        attribution: '© OpenStreetMap contributors',
        geojson: fakeGeoJson,
      },
    ]);

    const repo = new PrismaMarketRepository(prisma);
    const market = await repo.findById('ciudad-ojeda');

    expect(market).not.toBeNull();
    expect(market?.id).toBe('ciudad-ojeda');
    expect(market?.name).toBe('Ciudad Ojeda');
    expect(market?.boundary.type).toBe('Polygon');
    expect(market?.boundary.coordinates[0]).toHaveLength(6);
    expect(market?.isActive).toBe(true);
    expect(market?.attribution).toBe('© OpenStreetMap contributors');
  });

  it('findById returns null when market does not exist', async () => {
    const { prisma } = createFakePrisma();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const repo = new PrismaMarketRepository(prisma);
    const market = await repo.findById('unknown-market');

    expect(market).toBeNull();
  });

  it('findAllActive returns all active markets mapped to domain models', async () => {
    const { prisma } = createFakePrisma();
    const fakeGeoJson = JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-71.36, 10.16],
          [-71.33, 10.26],
          [-71.22, 10.26],
          [-71.18, 10.16],
          [-71.28, 10.1],
          [-71.36, 10.16],
        ],
      ],
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        id: 'ciudad-ojeda',
        name: 'Ciudad Ojeda',
        description: 'Pilot market',
        is_active: true,
        attribution: '© OpenStreetMap contributors',
        geojson: fakeGeoJson,
      },
    ]);

    const repo = new PrismaMarketRepository(prisma);
    const activeMarkets = await repo.findAllActive();

    expect(activeMarkets).toHaveLength(1);
    expect(activeMarkets[0].id).toBe('ciudad-ojeda');
    expect(activeMarkets[0].isActive).toBe(true);
  });

  it('containsPoint returns true when point is covered by the market boundary', async () => {
    const { prisma } = createFakePrisma();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ covered: true }]);

    const repo = new PrismaMarketRepository(prisma);
    const point: MarketPoint = { longitude: -71.3081, latitude: 10.1969 };
    const isCovered = await repo.containsPoint('ciudad-ojeda', point);

    expect(isCovered).toBe(true);
  });

  it('containsPoint returns false when point is outside the market boundary', async () => {
    const { prisma } = createFakePrisma();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ covered: false }]);

    const repo = new PrismaMarketRepository(prisma);
    const point: MarketPoint = { longitude: -70.0, latitude: 12.0 };
    const isCovered = await repo.containsPoint('ciudad-ojeda', point);

    expect(isCovered).toBe(false);
  });

  it('containsPoint returns false if market row is not found', async () => {
    const { prisma } = createFakePrisma();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const repo = new PrismaMarketRepository(prisma);
    const point: MarketPoint = { longitude: -71.3081, latitude: 10.1969 };
    const isCovered = await repo.containsPoint('unknown-market', point);

    expect(isCovered).toBe(false);
  });
});
