import { Money } from '../../../../catalog/money';
import {
  OfferTermsError,
  type Offer,
  type OfferTermsVersion,
} from '../../../domain/offer-terms-version';
import * as offerDtoModule from './offer.dto';

type OfferDtoMapper = (
  offer: Offer,
  currentTerms: OfferTermsVersion,
) => unknown;

const toOfferDto =
  (offerDtoModule as unknown as { toOfferDto?: OfferDtoMapper }).toOfferDto ??
  (() => {
    throw new Error('toOfferDto is not exported yet — add it to offer.dto.ts');
  });

describe('toOfferDto', () => {
  const offer: Offer = {
    id: 'offer-1',
    marketId: 'market-1',
    sellerId: 'seller-1',
    status: 'active',
    description: 'A seller offer',
    details: 'Meet at the central plaza',
    currentTermsVersionId: 'version-2',
    initialAmount: Money.of('100000.00', 'VES'),
    reservedAmount: Money.of('0.00', 'VES'),
    completedAmount: Money.of('0.00', 'VES'),
  };
  const currentTerms: OfferTermsVersion = {
    id: 'version-2',
    offerId: 'offer-1',
    version: 2,
    pairId: 'VES_USDT',
    giveAmount: Money.of('2000.00', 'VES'),
    receiveAmount: Money.of('2.000000', 'USDT'),
    rate: '0.00100000',
    marginPct: '2.50',
    minAmount: Money.of('20.00', 'VES'),
    maxAmount: Money.of('200000.00', 'VES'),
    expiresAt: new Date('2026-10-15T00:00:00.000Z'),
    createdAt: new Date('2026-10-02T00:00:00.000Z'),
  };

  it('exposes the current terms needed to inspect a published offer', () => {
    expect(toOfferDto(offer, currentTerms)).toEqual({
      id: 'offer-1',
      pairId: 'VES_USDT',
      currentTermsVersionId: 'version-2',
      terms: {
        version: 2,
        giveAmount: '2000.00',
        receiveAmount: '2.000000',
        rate: '0.00100000',
        marginPct: '2.50',
        minAmount: '20.00',
        maxAmount: '200000.00',
        expiresAt: '2026-10-15T00:00:00.000Z',
      },
    });
  });

  it('rejects terms from another offer or a stale version pointer', () => {
    expect(() =>
      toOfferDto(
        { ...offer, currentTermsVersionId: 'version-1' },
        currentTerms,
      ),
    ).toThrow(OfferTermsError);
    expect(() =>
      toOfferDto(offer, { ...currentTerms, offerId: 'offer-2' }),
    ).toThrow(OfferTermsError);
  });
});
