import {
  CANONICAL_PAIRS,
  CANONICAL_PAIR_IDS,
  CIUDAD_OJEDA_CORRIDORS,
  MVP_ASSETS,
  MVP_RAILS,
  calculateReceiveRange,
  filterOffers,
  formatTabularAmount,
  validateOfferDraft,
} from './catalog';
import { OFFERS_PREVIEW } from './preview-data';

describe('marketplace domain catalog (ADR-0008, ADR-0009, ADR-0010, ADR-0015, ADR-0017)', () => {
  it('defines the exact 5 canonical MVP pairs, 3 assets, and 4 rails with no Zelle', () => {
    expect(CANONICAL_PAIR_IDS).toEqual([
      'VES_USDT',
      'VES_BANK_TO_VES_CASH',
      'VES_USD_CASH',
      'USDT_VES',
      'USDT_USD_CASH',
    ]);
    expect(MVP_ASSETS).toEqual(['VES', 'USD', 'USDT']);
    expect(MVP_RAILS).toEqual([
      'VES_CASH',
      'VES_BANK_TRANSFER',
      'USD_CASH',
      'USDT_TRANSFER',
    ]);

    const serialized = JSON.stringify({
      CANONICAL_PAIRS,
      MVP_ASSETS,
      MVP_RAILS,
      CIUDAD_OJEDA_CORRIDORS,
    });
    expect(serialized.toLowerCase()).not.toContain('zelle');
  });

  it('requires a meeting when either leg is physical cash (ADR-0009)', () => {
    expect(CANONICAL_PAIRS.VES_USDT.requiresMeeting).toBe(false);
    expect(CANONICAL_PAIRS.USDT_VES.requiresMeeting).toBe(false);
    expect(CANONICAL_PAIRS.VES_BANK_TO_VES_CASH.requiresMeeting).toBe(true);
    expect(CANONICAL_PAIRS.VES_USD_CASH.requiresMeeting).toBe(true);
    expect(CANONICAL_PAIRS.USDT_USD_CASH.requiresMeeting).toBe(true);
  });

  it('calculates receive range for cross-asset pairs and same-asset margin pairs (ADR-0008, ADR-0010)', () => {
    // Cross-asset: seller gives USD cash ($20 - $250) at rate 39.20 VES per 1 USD -> 784.00 - 9,800.00 VES
    const range = calculateReceiveRange({
      pairId: 'VES_USD_CASH',
      minGiveAmount: 20,
      maxGiveAmount: 250,
      rate: 39.2,
      marginPercent: 0,
    });
    expect(range).toEqual({
      minReceiveFormatted: '784,00',
      maxReceiveFormatted: '9.800,00',
      receiveAsset: 'VES',
    });

    // Same-asset pair (VES_BANK_TO_VES_CASH) carries no rate, uses margin (0 <= margin < 100)
    const sameAssetRange = calculateReceiveRange({
      pairId: 'VES_BANK_TO_VES_CASH',
      minGiveAmount: 1000,
      maxGiveAmount: 5000,
      rate: null,
      marginPercent: 5,
    });
    expect(sameAssetRange).toEqual({
      minReceiveFormatted: '950,00',
      maxReceiveFormatted: '4.750,00',
      receiveAsset: 'VES',
    });
  });

  it('validates offer draft bounds (rate > 0 for cross-asset, 0 <= margin < 100, min > 0, min <= max)', () => {
    expect(
      validateOfferDraft({
        pairId: 'VES_USD_CASH',
        rate: 39.2,
        marginPercent: 0,
        minAmount: 20,
        maxAmount: 250,
        rails: ['VES_BANK_TRANSFER'],
        corridorId: 'ojeda-mall',
      }),
    ).toEqual({ valid: true, errors: {} });

    const invalid = validateOfferDraft({
      pairId: 'VES_USD_CASH',
      rate: 0,
      marginPercent: 100,
      minAmount: 300,
      maxAmount: 100,
      rails: [],
      corridorId: '',
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.rate).toBeDefined();
    expect(invalid.errors.marginPercent).toBeDefined();
    expect(invalid.errors.limits).toBeDefined();
    expect(invalid.errors.rails).toBeDefined();
    expect(invalid.errors.corridorId).toBeDefined();
  });

  it('filters offers deterministically by pair, rail, amount within min/max, and corridor (ADR-0015)', () => {
    const all = filterOffers(OFFERS_PREVIEW, {});
    expect(all.length).toBeGreaterThanOrEqual(3);

    const byPair = filterOffers(OFFERS_PREVIEW, { pairId: 'USDT_USD_CASH' });
    expect(byPair.every((o) => o.pairId === 'USDT_USD_CASH')).toBe(true);

    const byAmount = filterOffers(OFFERS_PREVIEW, { amount: 30 });
    expect(
      byAmount.every((o) => o.minAmount <= 30 && o.maxAmount >= 30),
    ).toBe(true);

    const byCorridor = filterOffers(OFFERS_PREVIEW, {
      corridorId: 'plaza-bolivar',
    });
    expect(byCorridor.every((o) => o.corridorId === 'plaza-bolivar')).toBe(
      true,
    );
  });

  it('formats tabular amounts deterministically', () => {
    expect(formatTabularAmount(39.2)).toBe('39,20');
    expect(formatTabularAmount(9800)).toBe('9.800,00');
  });
});
