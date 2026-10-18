import { PAIR_IDS, UnknownPairError, getPair, isPairId } from './catalog';
import type { PairId } from './catalog';

// ADR-0009 fixes the MVP catalog at exactly five canonical pair ids, on three
// assets and four rails, with the unqualified "VES" leg read as physical cash.
const EXPECTED_PAIR_IDS: PairId[] = [
  'VES_USDT',
  'VES_BANK_TO_VES_CASH',
  'VES_USD_CASH',
  'USDT_VES',
  'USDT_USD_CASH',
];

describe('the MVP pair catalog', () => {
  it('exposes exactly the five canonical pair ids', () => {
    expect(PAIR_IDS).toHaveLength(5);
    expect([...PAIR_IDS].sort()).toEqual([...EXPECTED_PAIR_IDS].sort());
  });

  it('maps each pair id to an ordered (give, receive) of legs', () => {
    expect(getPair('VES_USDT')).toEqual({
      id: 'VES_USDT',
      give: { asset: 'VES', rail: 'VES_CASH', delivery: 'physical' },
      receive: { asset: 'USDT', rail: 'USDT_TRANSFER', delivery: 'digital' },
    });
    expect(getPair('VES_BANK_TO_VES_CASH')).toEqual({
      id: 'VES_BANK_TO_VES_CASH',
      give: { asset: 'VES', rail: 'VES_BANK_TRANSFER', delivery: 'digital' },
      receive: { asset: 'VES', rail: 'VES_CASH', delivery: 'physical' },
    });
    expect(getPair('VES_USD_CASH')).toEqual({
      id: 'VES_USD_CASH',
      give: { asset: 'VES', rail: 'VES_CASH', delivery: 'physical' },
      receive: { asset: 'USD', rail: 'USD_CASH', delivery: 'physical' },
    });
    expect(getPair('USDT_VES')).toEqual({
      id: 'USDT_VES',
      give: { asset: 'USDT', rail: 'USDT_TRANSFER', delivery: 'digital' },
      receive: { asset: 'VES', rail: 'VES_CASH', delivery: 'physical' },
    });
    expect(getPair('USDT_USD_CASH')).toEqual({
      id: 'USDT_USD_CASH',
      give: { asset: 'USDT', rail: 'USDT_TRANSFER', delivery: 'digital' },
      receive: { asset: 'USD', rail: 'USD_CASH', delivery: 'physical' },
    });
  });

  it('resolves the unqualified "VES" leg to physical cash', () => {
    // The catalog itself contrasts "VES" with "VES in a bank account", so the
    // bare leg is the physical one.
    expect(getPair('VES_USDT').give).toMatchObject({
      asset: 'VES',
      rail: 'VES_CASH',
      delivery: 'physical',
    });
    expect(getPair('VES_USD_CASH').give).toMatchObject({
      asset: 'VES',
      rail: 'VES_CASH',
      delivery: 'physical',
    });
    expect(getPair('USDT_VES').receive).toMatchObject({
      asset: 'VES',
      rail: 'VES_CASH',
      delivery: 'physical',
    });
  });

  it('keeps the bank VES rail distinct from the physical VES rail', () => {
    const pair = getPair('VES_BANK_TO_VES_CASH');
    expect(pair.give.rail).toBe('VES_BANK_TRANSFER');
    expect(pair.give.delivery).toBe('digital');
    expect(pair.receive.rail).toBe('VES_CASH');
    expect(pair.receive.delivery).toBe('physical');
  });

  it('rejects an unknown pair id', () => {
    expect(isPairId('VES_EUR')).toBe(false);
    expect(isPairId('VES_USDT')).toBe(true);
    expect(() => getPair('VES_EUR')).toThrow(UnknownPairError);
    expect(() => getPair('VES_EUR')).toThrow(/Unknown pair id/);
  });
});
