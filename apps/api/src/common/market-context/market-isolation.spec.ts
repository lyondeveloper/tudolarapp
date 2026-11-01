import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';
import { assertMarketMatch } from './market-isolation';

describe('assertMarketMatch (market isolation)', () => {
  it('does not throw when requested market matches entity market', () => {
    expect(() =>
      assertMarketMatch('ciudad-ojeda', 'ciudad-ojeda'),
    ).not.toThrow();
  });

  it('normalizes whitespace around market identifiers', () => {
    expect(() =>
      assertMarketMatch('  ciudad-ojeda  ', 'ciudad-ojeda'),
    ).not.toThrow();
  });

  it('throws MARKET_MISMATCH when markets do not match', () => {
    expect(() => assertMarketMatch('ciudad-ojeda', 'cabimas')).toThrow(
      ApplicationError,
    );

    try {
      assertMarketMatch('ciudad-ojeda', 'cabimas');
    } catch (err) {
      expect(err).toBeInstanceOf(ApplicationError);
      expect((err as ApplicationError).code).toBe(ApiErrorCode.MARKET_MISMATCH);
    }
  });

  it('throws MARKET_MISMATCH when either market id is empty or blank', () => {
    expect(() => assertMarketMatch('', 'ciudad-ojeda')).toThrow(
      ApplicationError,
    );
    expect(() => assertMarketMatch('ciudad-ojeda', '  ')).toThrow(
      ApplicationError,
    );
  });
});
