import { createMarket, InvalidMarketError, MarketBoundary } from './market';

describe('Market domain entity', () => {
  const validBoundary: MarketBoundary = {
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
  };

  it('creates a valid active market with boundary and attribution', () => {
    const market = createMarket({
      id: 'ciudad-ojeda',
      name: 'Ciudad Ojeda',
      description: 'Pilot market covering Municipio Lagunillas',
      boundary: validBoundary,
      isActive: true,
      attribution: '© OpenStreetMap contributors',
    });

    expect(market.id).toBe('ciudad-ojeda');
    expect(market.name).toBe('Ciudad Ojeda');
    expect(market.description).toBe(
      'Pilot market covering Municipio Lagunillas',
    );
    expect(market.isActive).toBe(true);
    expect(market.boundary).toEqual(validBoundary);
    expect(market.attribution).toBe('© OpenStreetMap contributors');
  });

  it('rejects an empty or blank market id', () => {
    expect(() =>
      createMarket({
        id: '   ',
        name: 'Ciudad Ojeda',
        boundary: validBoundary,
      }),
    ).toThrow(InvalidMarketError);
  });

  it('rejects an empty or blank market name', () => {
    expect(() =>
      createMarket({
        id: 'ciudad-ojeda',
        name: '',
        boundary: validBoundary,
      }),
    ).toThrow(InvalidMarketError);
  });

  it('rejects an unclosed polygon where first and last coordinates differ', () => {
    const unclosedBoundary: MarketBoundary = {
      type: 'Polygon',
      coordinates: [
        [
          [-71.35, 10.15],
          [-71.25, 10.15],
          [-71.25, 10.25],
          [-71.35, 10.25],
        ],
      ],
    };

    expect(() =>
      createMarket({
        id: 'ciudad-ojeda',
        name: 'Ciudad Ojeda',
        boundary: unclosedBoundary,
      }),
    ).toThrow(InvalidMarketError);
  });

  it('rejects a polygon with fewer than 4 positions in the linear ring', () => {
    const insufficientPointsBoundary: MarketBoundary = {
      type: 'Polygon',
      coordinates: [
        [
          [-71.35, 10.15],
          [-71.25, 10.15],
          [-71.35, 10.15],
        ],
      ],
    };

    expect(() =>
      createMarket({
        id: 'ciudad-ojeda',
        name: 'Ciudad Ojeda',
        boundary: insufficientPointsBoundary,
      }),
    ).toThrow(InvalidMarketError);
  });

  it('rejects coordinates with latitude outside -90 to 90 or longitude outside -180 to 180', () => {
    const invalidCoordsBoundary: MarketBoundary = {
      type: 'Polygon',
      coordinates: [
        [
          [-71.35, 95.0],
          [-71.25, 10.15],
          [-71.25, 10.25],
          [-71.35, 95.0],
        ],
      ],
    };

    expect(() =>
      createMarket({
        id: 'ciudad-ojeda',
        name: 'Ciudad Ojeda',
        boundary: invalidCoordsBoundary,
      }),
    ).toThrow(InvalidMarketError);
  });
});
