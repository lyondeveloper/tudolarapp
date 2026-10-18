import { buildOfferSpatialWhere } from '../../domain/market-predicate';
import {
  SPATIAL_SORT_OPTIONS,
  UnknownSortOptionError,
  buildOrderBy,
  resolveSortOption,
  toPrismaSql,
} from './postgis-offer-query';

// ADR-0023: values are parameterized, never interpolated, and identifiers that
// cannot be parameterized come from an explicit allowlist.

const MARKET = 'ciudad-ojeda';
const PROXIMITY = {
  longitude: -71.3315,
  latitude: 10.3985,
  radiusMeters: 5_000,
};

describe('the parameterized PostGIS offer query helper', () => {
  it('binds every fragment value as a parameter, leaving no value in the SQL text', () => {
    const fragment = buildOfferSpatialWhere({
      scope: { marketId: MARKET },
      proximity: PROXIMITY,
    });

    const query = toPrismaSql(fragment);

    expect(query.values).toEqual([
      MARKET,
      PROXIMITY.longitude,
      PROXIMITY.latitude,
      PROXIMITY.radiusMeters,
    ]);
    expect(query.sql).toContain('ST_DWithin');
    expect(query.sql).toContain('offers.market_id');
    expect(query.sql).not.toContain(MARKET);
  });

  it('rejects a sort option outside the allowlist', () => {
    expect(() => resolveSortOption('; DROP TABLE offers')).toThrow(
      UnknownSortOptionError,
    );
    expect(resolveSortOption('distance')).toBe('distance');
    expect(SPATIAL_SORT_OPTIONS).toContain('recent');
  });

  it('orders only by allowlisted identifiers, with a stable tie-break', () => {
    expect(buildOrderBy('distance')).toContain('offers.id');
    expect(buildOrderBy('recent')).toContain('offers.created_at');
  });

  it('rejects a placeholder with no bound parameter', () => {
    expect(() =>
      toPrismaSql({ sql: 'offers.id = $2', params: ['only-one'] }),
    ).toThrow('has no bound parameter');
  });

  it('rejects unsafe SQL text in a fragment', () => {
    expect(() =>
      toPrismaSql({ sql: "offers.id = '1'; DROP TABLE offers", params: [] }),
    ).toThrow('unsafe SQL text');
  });
});
