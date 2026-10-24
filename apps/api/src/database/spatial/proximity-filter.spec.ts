import {
  createSpatialAllowlist,
  kilometresToMeters,
  proximityFilter,
} from './proximity-filter';

describe('proximityFilter', () => {
  const allowlist = createSpatialAllowlist([
    { table: 'spatial_probe_points', geographyColumn: 'location' },
  ]);

  it('binds longitude, latitude, and radius in meters as parameters without interpolating them into SQL', () => {
    const sql = proximityFilter(
      {
        table: 'spatial_probe_points',
        geographyColumn: 'location',
        longitude: -71.3081,
        latitude: 10.1969,
        radiusMeters: 2500,
        maxRadiusMeters: 50000,
      },
      allowlist,
    );

    expect(sql.values).toEqual([-71.3081, 10.1969, 2500]);
    const joinedText = sql.strings.join('?');
    expect(joinedText).toContain('ST_DWithin');
    expect(joinedText).toContain(
      '"spatial_probe_points"."location"::geography',
    );
    expect(joinedText).toContain('ST_SetSRID(ST_MakePoint(');
    expect(joinedText).toContain('4326)::geography');
    expect(joinedText).not.toContain('-71.3081');
    expect(joinedText).not.toContain('10.1969');
    expect(joinedText).not.toContain('2500');
  });

  it('converts kilometres to meters explicitly', () => {
    const meters = kilometresToMeters(5);
    expect(meters).toBe(5000);

    const sql = proximityFilter(
      {
        table: 'spatial_probe_points',
        geographyColumn: 'location',
        longitude: -71.3081,
        latitude: 10.1969,
        radiusMeters: meters,
        maxRadiusMeters: kilometresToMeters(50),
      },
      allowlist,
    );
    expect(sql.values).toEqual([-71.3081, 10.1969, 5000]);
  });

  it('rejects a table or column outside the allowlist before building SQL', () => {
    expect(() =>
      proximityFilter(
        {
          table: 'offers; DROP TABLE users;--',
          geographyColumn: 'location',
          longitude: -71.3,
          latitude: 10.2,
          radiusMeters: 1000,
          maxRadiusMeters: 10000,
        },
        allowlist,
      ),
    ).toThrow(/not allowlisted/i);

    expect(() =>
      proximityFilter(
        {
          table: 'spatial_probe_points',
          geographyColumn: 'other_col',
          longitude: -71.3,
          latitude: 10.2,
          radiusMeters: 1000,
          maxRadiusMeters: 10000,
        },
        allowlist,
      ),
    ).toThrow(/not allowlisted/i);
  });

  it.each([
    ['zero radius', { radiusMeters: 0 }],
    ['negative radius', { radiusMeters: -10 }],
    ['NaN radius', { radiusMeters: Number.NaN }],
    ['infinite radius', { radiusMeters: Number.POSITIVE_INFINITY }],
    [
      'radius above caller maximum',
      { radiusMeters: 10001, maxRadiusMeters: 10000 },
    ],
    ['invalid maxRadiusMeters', { maxRadiusMeters: 0 }],
    ['latitude below -90', { latitude: -90.001 }],
    ['latitude above 90', { latitude: 90.001 }],
    ['NaN latitude', { latitude: Number.NaN }],
    ['longitude below -180', { longitude: -180.001 }],
    ['longitude above 180', { longitude: 180.001 }],
    ['NaN longitude', { longitude: Number.NaN }],
  ])('rejects invalid input: %s', (_label, overrides) => {
    expect(() =>
      proximityFilter(
        {
          table: 'spatial_probe_points',
          geographyColumn: 'location',
          longitude: -71.3081,
          latitude: 10.1969,
          radiusMeters: 1000,
          maxRadiusMeters: 10000,
          ...overrides,
        },
        allowlist,
      ),
    ).toThrow();
  });
});
