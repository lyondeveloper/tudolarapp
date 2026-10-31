import {
  CONVERSATION_PREVIEW,
  MARKET_NODE_PREVIEW,
  OFFERS_PREVIEW,
  findOfferById,
} from './preview-data';

describe('marketplace preview dataset (ADR-0009, ADR-0013, ADR-0017, ADR-0018)', () => {
  it('marks preview data explicitly and scopes every offer to Ciudad Ojeda', () => {
    expect(MARKET_NODE_PREVIEW.marketId).toBe('ciudad-ojeda');
    expect(MARKET_NODE_PREVIEW.defaultRadiusKm).toBe(5);
    expect(MARKET_NODE_PREVIEW.isPreviewData).toBe(true);

    expect(OFFERS_PREVIEW.length).toBeGreaterThanOrEqual(3);
    for (const offer of OFFERS_PREVIEW) {
      expect(offer.marketId).toBe('ciudad-ojeda');
      expect(offer.isPreviewData).toBe(true);
      expect(offer.distanceKm).toBeLessThanOrEqual(5);
    }
  });

  it('excludes Zelle, reputation scores, star ratings, and earnings labels (ADR-0009, ADR-0013, ADR-0018)', () => {
    const serialized = JSON.stringify({
      MARKET_NODE_PREVIEW,
      OFFERS_PREVIEW,
      CONVERSATION_PREVIEW,
    });

    expect(serialized).not.toMatch(/zelle/i);
    expect(serialized).not.toMatch(/reputaci[oó]n/i);
    expect(serialized).not.toMatch(/calificaci[oó]n/i);
    expect(serialized).not.toMatch(/ganancias|earnings|profit/i);
    expect(serialized).not.toMatch(/password/i);
  });

  it('resolves an offer by id and falls back to the primary preview offer', () => {
    const primary = findOfferById('td-892');
    expect(primary.id).toBe('td-892');
    expect(primary.sellerDisplayName).toBe('Carlos M.');

    const fallback = findOfferById('non-existent');
    expect(fallback.id).toBe('td-892');
  });
});
