/**
 * The quote — pure domain, no infrastructure imports.
 *
 * A quote is the seller's stated terms, frozen for a buyer (ADR-0008). It
 * freezes the `termsVersionId` the buyer was shown, so a confirmation binds to
 * exactly those numbers. It carries no reference rate and no reference as-of
 * time, because the platform publishes no reference rate and derives none.
 *
 * The validity window is 15 minutes (ADR-0010 B3).
 */

/** Quote validity: 15 minutes (ADR-0010 B3). */
export const QUOTE_VALIDITY_MS = 15 * 60 * 1000;

/**
 * The seller's stated terms, frozen for one buyer. Deliberately carries no
 * reference rate and no reference as-of time.
 */
export interface Quote {
  readonly id: string;
  readonly offerId: string;
  readonly termsVersionId: string;
  readonly buyerId: string;
  readonly validUntil: Date;
  readonly createdAt: Date;
}

export interface CreateQuoteInput {
  readonly id: string;
  readonly now: Date;
  readonly offerId: string;
  readonly termsVersionId: string;
  readonly buyerId: string;
}

/** What a confirmation binds to: the version the buyer was shown. */
export interface Confirmation {
  readonly quoteId: string;
  readonly termsVersionId: string;
  readonly offerId: string;
  readonly buyerId: string;
  readonly confirmedAt: Date;
}

/** Thrown when a quote is confirmed at or after its validity window. */
export class QuoteExpiredError extends Error {
  constructor(quoteId: string) {
    super(`Quote ${quoteId} has expired`);
    this.name = 'QuoteExpiredError';
  }
}

/** Freezes a terms version for a buyer, valid for 15 minutes from `now`. */
export function createQuote(input: CreateQuoteInput): Quote {
  return Object.freeze({
    id: input.id,
    offerId: input.offerId,
    termsVersionId: input.termsVersionId,
    buyerId: input.buyerId,
    createdAt: input.now,
    validUntil: new Date(input.now.getTime() + QUOTE_VALIDITY_MS),
  });
}

/**
 * Binds a confirmation to the version the quote froze. The window is
 * half-open: a confirmation at exactly `validUntil` is rejected.
 */
export function confirmQuote(quote: Quote, at: Date): Confirmation {
  if (at.getTime() >= quote.validUntil.getTime()) {
    throw new QuoteExpiredError(quote.id);
  }
  return Object.freeze({
    quoteId: quote.id,
    termsVersionId: quote.termsVersionId,
    offerId: quote.offerId,
    buyerId: quote.buyerId,
    confirmedAt: at,
  });
}
