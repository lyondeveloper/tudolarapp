import type { Asset } from './catalog';

/**
 * The money value object — pure domain, no infrastructure imports.
 *
 * A value is an exact decimal plus its asset, held internally as an integer
 * count of the asset's minor units so no binary floating point ever touches a
 * monetary amount (AGENTS.md:45). Rounding happens once, server-side, to the
 * receive asset's minor unit (ADR-0010 B4): VES and USD to 2 decimals, USDT to
 * 6.
 *
 * Two operations, deliberately separate:
 *   - `Money.of` is the exact constructor. A value with more precision than the
 *     asset's minor unit cannot be represented exactly, so it is rejected — never
 *     silently truncated.
 *   - `Money.round` is the single permitted rounding step. Call it once, at
 *     quote creation, with the receive asset.
 */

/** The number of decimal places each asset's minor unit carries (ADR-0010 B4). */
export const MINOR_UNIT_SCALE: Readonly<Record<Asset, number>> = Object.freeze({
  VES: 2,
  USD: 2,
  USDT: 6,
});

/** Thrown when a value is not an exact decimal amount for its asset. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

// A canonical decimal: an optional sign, digits, and an optional fractional part.
const DECIMAL = /^[+-]?\d+(?:\.\d+)?$/;

function assertDecimal(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new MoneyError(
      'Money amounts are exact decimals; a number (float) is not accepted',
    );
  }
  if (!DECIMAL.test(value)) {
    throw new MoneyError(`Not a decimal value: ${String(value)}`);
  }
}

function split(value: string): {
  negative: boolean;
  integer: string;
  fraction: string;
} {
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  return { negative, integer, fraction };
}

export class Money {
  private constructor(
    readonly asset: Asset,
    readonly minorUnits: bigint,
  ) {}

  /**
   * Exact construction. A value with more fractional digits than the asset's
   * minor unit is rejected rather than silently truncated; only trailing zeros
   * beyond the scale are accepted, because they carry no information.
   */
  static of(value: string, asset: Asset): Money {
    assertDecimal(value);
    const scale = MINOR_UNIT_SCALE[asset];
    const { negative, integer, fraction } = split(value);

    if (fraction.length > scale && /[^0]/.test(fraction.slice(scale))) {
      throw new MoneyError(
        `Value ${value} cannot be represented exactly in ${asset} (scale ${scale}); ` +
          'round it once with Money.round instead of truncating it',
      );
    }

    const scaled = fraction.padEnd(scale, '0').slice(0, scale);
    const units = BigInt(`${integer}${scaled}`);
    return new Money(asset, negative ? -units : units);
  }

  /**
   * The single rounding step, to the asset's minor unit (half-up, away from
   * zero). Idempotent: rounding an already-rounded value changes nothing.
   */
  static round(value: string, asset: Asset): Money {
    assertDecimal(value);
    const scale = MINOR_UNIT_SCALE[asset];
    const { negative, integer, fraction } = split(value);

    if (fraction.length <= scale) {
      return Money.of(value, asset);
    }

    const kept = fraction.slice(0, scale);
    const roundUp = fraction.charCodeAt(scale) - 48 >= 5;
    let units = BigInt(`${integer}${kept}`);
    if (roundUp) {
      units += 1n;
    }
    return new Money(asset, negative ? -units : units);
  }

  /** The canonical decimal string, with exactly the asset's scale. */
  toDecimalString(): string {
    const scale = MINOR_UNIT_SCALE[this.asset];
    const negative = this.minorUnits < 0n;
    const magnitude = (
      negative ? -this.minorUnits : this.minorUnits
    ).toString();
    const digits = magnitude.padStart(scale + 1, '0');
    const integer = digits.slice(0, digits.length - scale) || '0';
    const fraction = scale > 0 ? `.${digits.slice(digits.length - scale)}` : '';
    return `${negative ? '-' : ''}${integer}${fraction}`;
  }

  equals(other: Money): boolean {
    return this.asset === other.asset && this.minorUnits === other.minorUnits;
  }

  add(other: Money): Money {
    if (other.asset !== this.asset) {
      throw new MoneyError(
        `Cannot add ${this.asset} and ${other.asset}: assets must match`,
      );
    }
    return new Money(this.asset, this.minorUnits + other.minorUnits);
  }
}
