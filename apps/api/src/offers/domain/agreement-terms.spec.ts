import { Money } from '../../catalog/money';
import { applyMaterialEdit, appendVersion } from './offer-terms-version';
import type {
  MaterialTermsEdit,
  Offer,
  OfferTermsVersion,
} from './offer-terms-version';
import {
  AgreementTermsNotFoundError,
  resolveAgreementTerms,
} from './agreement-terms';
import type { AgreementTermsReference } from './agreement-terms';

// ADR-0001: an agreement references a `termsVersionId`, not a copy of the terms.
// A later offer edit inserts a new version and cannot change the numbers a
// confirmed agreement already bound to.
describe('an agreement terms reference', () => {
  const versionOne: OfferTermsVersion = Object.freeze({
    id: 'version-1',
    offerId: 'offer-1',
    version: 1,
    pairId: 'VES_USDT',
    giveAmount: Money.of('1000.00', 'VES'),
    receiveAmount: Money.of('1.000000', 'USDT'),
    rate: '0.00100000',
    marginPct: '1.00',
    minAmount: Money.of('10.00', 'VES'),
    maxAmount: Money.of('100000.00', 'VES'),
    expiresAt: new Date('2026-11-01T00:00:00.000Z'),
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
  });

  const offer: Offer = Object.freeze({
    id: 'offer-1',
    marketId: 'market-1',
    sellerId: 'seller-1',
    status: 'active',
    description: 'A seller offer',
    details: null,
    currentTermsVersionId: 'version-1',
    initialAmount: Money.of('100000.00', 'VES'),
    reservedAmount: Money.of('0.00', 'VES'),
    completedAmount: Money.of('0.00', 'VES'),
  });

  const reference: AgreementTermsReference = Object.freeze({
    agreementId: 'agreement-1',
    offerId: 'offer-1',
    termsVersionId: 'version-1',
  });

  it('references a version id rather than copying the terms', () => {
    expect(Object.keys(reference).sort()).toEqual([
      'agreementId',
      'offerId',
      'termsVersionId',
    ]);
    expect('giveAmount' in reference).toBe(false);
    expect('receiveAmount' in reference).toBe(false);
    expect('rate' in reference).toBe(false);
    expect('marginPct' in reference).toBe(false);
    expect(reference.termsVersionId).toBe(versionOne.id);
  });

  it('resolves the agreed numbers from the referenced version', () => {
    const terms = resolveAgreementTerms(reference, [versionOne]);
    expect(terms).toBe(versionOne);
    expect(terms.giveAmount.equals(versionOne.giveAmount)).toBe(true);
  });

  it('cannot be changed by a later offer edit', () => {
    const edit: MaterialTermsEdit = Object.freeze({
      pairId: 'VES_USDT',
      giveAmount: Money.of('9999.00', 'VES'),
      receiveAmount: Money.of('9.999999', 'USDT'),
      rate: '0.00100000',
      marginPct: '9.99',
      minAmount: Money.of('99.00', 'VES'),
      maxAmount: Money.of('999999.00', 'VES'),
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
    });

    const { version: versionTwo } = applyMaterialEdit(offer, versionOne, edit, {
      id: 'version-2',
      now: new Date('2026-10-02T00:00:00.000Z'),
    });
    const history = appendVersion([versionOne], versionTwo);

    // The offer now points at v2, but the agreement still resolves to v1's
    // numbers — the edit cannot reach a confirmed agreement.
    const terms = resolveAgreementTerms(reference, history);
    expect(terms.id).toBe('version-1');
    expect(terms.giveAmount.equals(Money.of('1000.00', 'VES'))).toBe(true);
    expect(terms.marginPct).toBe('1.00');
    expect(terms.giveAmount.equals(versionTwo.giveAmount)).toBe(false);
  });

  it('rejects a reference to a version that does not exist', () => {
    expect(() => resolveAgreementTerms(reference, [])).toThrow(
      AgreementTermsNotFoundError,
    );
  });
});
