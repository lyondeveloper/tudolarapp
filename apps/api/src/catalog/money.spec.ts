import { MINOR_UNIT_SCALE, Money, MoneyError } from './money';

// ADR-0010 B4: round once, server-side, to the receive asset's minor unit —
// VES and USD to 2 decimals, USDT to 6. Money is an exact decimal, never a
// float (AGENTS.md:45).
describe('the money value object', () => {
  it('exposes the minor-unit scale per asset (VES/USD 2, USDT 6)', () => {
    expect(MINOR_UNIT_SCALE).toEqual({ VES: 2, USD: 2, USDT: 6 });
  });

  it('represents values as exact decimals, never floats', () => {
    // A JS number (float) is refused outright: 0.1 + 0.2 is not 0.3 in binary
    // floating point, so a float must never reach the money type.
    expect(() => Money.of(0.1 as unknown as string, 'VES')).toThrow(MoneyError);

    const sum = Money.of('0.1', 'VES').add(Money.of('0.2', 'VES'));
    expect(sum.equals(Money.of('0.3', 'VES'))).toBe(true);
    expect(sum.toDecimalString()).toBe('0.30');
    expect(sum.toDecimalString()).not.toBe((0.1 + 0.2).toString());
  });

  it('rounds once, to the receive asset minor unit', () => {
    // The same value rounds to two different scales depending on the receive asset.
    expect(Money.round('1.23456789', 'VES').toDecimalString()).toBe('1.23');
    expect(Money.round('1.23456789', 'USD').toDecimalString()).toBe('1.23');
    expect(Money.round('1.23456789', 'USDT').toDecimalString()).toBe(
      '1.234568',
    );

    // Half-up, away from zero.
    expect(Money.round('1.005', 'VES').toDecimalString()).toBe('1.01');
    expect(Money.round('1.004', 'VES').toDecimalString()).toBe('1.00');
    expect(Money.round('0.0000005', 'USDT').toDecimalString()).toBe('0.000001');

    // Rounding is a single step: rounding an already-rounded value changes nothing.
    const once = Money.round('1.23456789', 'USDT');
    expect(Money.round(once.toDecimalString(), 'USDT').equals(once)).toBe(true);
  });

  it('rejects a value that cannot be represented exactly instead of silently truncating', () => {
    // "1.005" has more precision than VES allows; it is rejected, and it is not
    // quietly truncated to "1.00".
    expect(() => Money.of('1.005', 'VES')).toThrow(MoneyError);

    let truncated: string | undefined;
    try {
      truncated = Money.of('1.005', 'VES').toDecimalString();
    } catch {
      truncated = undefined;
    }
    expect(truncated).toBeUndefined();

    expect(() => Money.of('1.1234567', 'USDT')).toThrow(MoneyError);

    // Trailing zeros beyond the scale carry no information, so they are exact.
    expect(Money.of('1.2300', 'VES').toDecimalString()).toBe('1.23');
    expect(Money.of('1.1234560', 'USDT').toDecimalString()).toBe('1.123456');
  });

  it('refuses to add different assets', () => {
    expect(() => Money.of('1.00', 'VES').add(Money.of('1.00', 'USD'))).toThrow(
      MoneyError,
    );
  });
});
