import {
  InvalidSpatialInputError,
  OFFER_SPATIAL_IDENTIFIERS,
  SRID_WGS84,
  buildOfferSpatialWhere,
} from './market-predicate';

// ADR-0023 and design.md ("Safe PostGIS queries"): the market predicate and the
// proximity predicate always sit in the **same** WHERE, so no query can return
// an out-of-market offer. Values are parameterized; only identifiers and the
// SRID, which cannot be parameterized, come from an explicit allowlist.

const MARKET = 'ciudad-ojeda';
const PROXIMITY = {
  longitude: -71.3315,
  latitude: 10.3985,
  radiusMeters: 5_000,
};

describe('the offer spatial predicate', () => {
  it('always scopes the query to the market, even without proximity', () => {
    const fragment = buildOfferSpatialWhere({ scope: { marketId: MARKET } });

    expect(fragment.sql).toContain('offers.market_id = $1');
    expect(fragment.sql).not.toContain('ST_DWithin');
    expect(fragment.params).toEqual([MARKET]);
  });

  it('co-locates the proximity predicate with the market predicate in one WHERE', () => {
    const fragment = buildOfferSpatialWhere({
      scope: { marketId: MARKET },
      proximity: PROXIMITY,
    });

    // Both predicates are in the same fragment, joined by AND — there is no
    // separate proximity-only builder that could omit market scope.
    expect(fragment.sql).toContain('offers.market_id = $1');
    expect(fragment.sql).toContain('ST_DWithin');
    expect(fragment.sql).toContain(' AND ');
    expect(fragment.params).toEqual([
      MARKET,
      PROXIMITY.longitude,
      PROXIMITY.latitude,
      PROXIMITY.radiusMeters,
    ]);
  });

  it('parameterizes every value: no value appears in the SQL text', () => {
    const fragment = buildOfferSpatialWhere({
      scope: { marketId: MARKET },
      proximity: PROXIMITY,
    });

    expect(fragment.sql).not.toContain(MARKET);
    expect(fragment.sql).not.toContain(String(PROXIMITY.longitude));
    expect(fragment.sql).not.toContain(String(PROXIMITY.latitude));
    expect(fragment.sql).not.toContain(String(PROXIMITY.radiusMeters));
    expect(fragment.sql).toMatch(/\$1/);
    expect(fragment.sql).toMatch(/\$2/);
    expect(fragment.sql).toMatch(/\$3/);
    expect(fragment.sql).toMatch(/\$4/);
  });

  it('cannot produce a proximity predicate without the market predicate', () => {
    // A missing or blank market scope is rejected rather than producing a
    // proximity-only query that could return an out-of-market offer.
    expect(() =>
      buildOfferSpatialWhere({
        scope: { marketId: '   ' },
        proximity: PROXIMITY,
      }),
    ).toThrow(InvalidSpatialInputError);

    expect(() =>
      // @ts-expect-error a market scope is required by the signature
      buildOfferSpatialWhere({ proximity: PROXIMITY }),
    ).toThrow(InvalidSpatialInputError);
  });

  it('references only allowlisted identifiers and a consistent SRID', () => {
    const fragment = buildOfferSpatialWhere({
      scope: { marketId: MARKET },
      proximity: PROXIMITY,
    });

    expect(fragment.sql).toContain(
      `${OFFER_SPATIAL_IDENTIFIERS.table}.${OFFER_SPATIAL_IDENTIFIERS.marketId}`,
    );
    expect(fragment.sql).toContain('ST_SetSRID');
    expect(fragment.sql).toContain(String(SRID_WGS84));
  });

  it('rejects an out-of-range proximity rather than building a bad query', () => {
    expect(() =>
      buildOfferSpatialWhere({
        scope: { marketId: MARKET },
        proximity: { ...PROXIMITY, latitude: 200 },
      }),
    ).toThrow(InvalidSpatialInputError);

    expect(() =>
      buildOfferSpatialWhere({
        scope: { marketId: MARKET },
        proximity: { ...PROXIMITY, radiusMeters: 0 },
      }),
    ).toThrow(InvalidSpatialInputError);
  });
});
