import {
  QUOTE_VALIDITY_MS,
  QuoteExpiredError,
  confirmQuote,
  createQuote,
} from './quote';

// ADR-0010 B3: quote validity is 15 minutes, and the confirmation binds to the
// quote it was shown. ADR-0008: there is no reference rate and no reference
// as-of time, so the quote carries none.
describe('the quote', () => {
  const t0 = new Date('2026-10-17T12:00:00.000Z');

  function newQuote() {
    return createQuote({
      id: 'quote-1',
      now: t0,
      offerId: 'offer-1',
      termsVersionId: 'version-7',
      buyerId: 'buyer-1',
    });
  }

  it('freezes the terms version for a buyer', () => {
    const quote = newQuote();
    expect(quote.id).toBe('quote-1');
    expect(quote.offerId).toBe('offer-1');
    expect(quote.termsVersionId).toBe('version-7');
    expect(quote.buyerId).toBe('buyer-1');
    expect(quote.createdAt).toBe(t0);
  });

  it('expires after 15 minutes', () => {
    expect(QUOTE_VALIDITY_MS).toBe(15 * 60 * 1000);
    const quote = newQuote();
    expect(quote.validUntil.getTime()).toBe(t0.getTime() + 15 * 60 * 1000);
  });

  it('carries no reference rate and no reference as-of time', () => {
    const quote = newQuote();
    expect(Object.keys(quote).sort()).toEqual([
      'buyerId',
      'createdAt',
      'id',
      'offerId',
      'termsVersionId',
      'validUntil',
    ]);
    expect('referenceRate' in quote).toBe(false);
    expect('referenceAsOf' in quote).toBe(false);
    expect('referenceRateAsOf' in quote).toBe(false);
  });

  it('binds a confirmation to the version the buyer was shown', () => {
    const quote = newQuote();
    const confirmation = confirmQuote(
      quote,
      new Date(t0.getTime() + 14 * 60 * 1000),
    );

    expect(confirmation.termsVersionId).toBe(quote.termsVersionId);
    expect(confirmation.offerId).toBe(quote.offerId);
    expect(confirmation.quoteId).toBe(quote.id);
  });

  it('rejects a confirmation at or after the validity window', () => {
    const quote = newQuote();
    expect(() =>
      confirmQuote(quote, new Date(t0.getTime() + 15 * 60 * 1000)),
    ).toThrow(QuoteExpiredError);
    expect(() =>
      confirmQuote(quote, new Date(t0.getTime() + 16 * 60 * 1000)),
    ).toThrow(QuoteExpiredError);
  });
});
