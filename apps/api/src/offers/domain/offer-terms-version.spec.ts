import { Money } from '../../catalog/money';
import { appendVersion, applyMaterialEdit } from './offer-terms-version';
import type {
  MaterialTermsEdit,
  Offer,
  OfferTermsVersion,
} from './offer-terms-version';

// ADR-0001: the immutable terms version belongs to the offer. A material edit
// inserts version N+1 and moves the offer's pointer; it never updates a version
// row, so a later edit cannot silently change terms both parties confirmed.
describe('offer terms versions', () => {
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
    currentTermsVersionId: 'version-1',
  });

  const materialEdit: MaterialTermsEdit = Object.freeze({
    pairId: 'VES_USDT',
    giveAmount: Money.of('2000.00', 'VES'),
    receiveAmount: Money.of('2.000000', 'USDT'),
    rate: '0.00100000',
    marginPct: '2.50',
    minAmount: Money.of('20.00', 'VES'),
    maxAmount: Money.of('200000.00', 'VES'),
    expiresAt: new Date('2026-11-15T00:00:00.000Z'),
  });

  it('produces version N+1 and moves the offer current pointer', () => {
    const before = structuredClone(versionOne);

    const { offer: updated, version: versionTwo } = applyMaterialEdit(
      offer,
      versionOne,
      materialEdit,
      { id: 'version-2', now: new Date('2026-10-02T00:00:00.000Z') },
    );

    expect(versionTwo.version).toBe(2);
    expect(versionTwo.id).toBe('version-2');
    expect(versionTwo.offerId).toBe('offer-1');
    expect(updated.currentTermsVersionId).toBe('version-2');
    expect(updated.id).toBe('offer-1');

    // The inputs are untouched: the offer still points at v1, and v1 is exactly
    // as it was — no version row was updated in place.
    expect(offer.currentTermsVersionId).toBe('version-1');
    expect(versionOne).toEqual(before);
    expect(versionOne.version).toBe(1);
  });

  it('carries the edited numbers only in the new version', () => {
    const before = structuredClone(versionOne);

    const { version: versionTwo } = applyMaterialEdit(
      offer,
      versionOne,
      materialEdit,
      { id: 'version-2', now: new Date('2026-10-02T00:00:00.000Z') },
    );

    expect(versionTwo.giveAmount.equals(materialEdit.giveAmount)).toBe(true);
    expect(versionTwo.marginPct).toBe('2.50');

    expect(versionOne.giveAmount).toEqual(before.giveAmount);
    expect(versionOne.marginPct).toBe('1.00');
  });

  it('keeps an append-only history, never replacing an existing row', () => {
    const { version: versionTwo } = applyMaterialEdit(
      offer,
      versionOne,
      materialEdit,
      { id: 'version-2', now: new Date('2026-10-02T00:00:00.000Z') },
    );
    const { version: versionThree } = applyMaterialEdit(
      { ...offer, currentTermsVersionId: versionTwo.id },
      versionTwo,
      materialEdit,
      { id: 'version-3', now: new Date('2026-10-03T00:00:00.000Z') },
    );

    const history = appendVersion(
      appendVersion([versionOne], versionTwo),
      versionThree,
    );

    expect(history.map((entry) => entry.version)).toEqual([1, 2, 3]);
    // The earlier rows are the same references, not copies that overwrote them.
    expect(history[0]).toBe(versionOne);
    expect(history[1]).toBe(versionTwo);
    expect(new Set(history.map((entry) => entry.id)).size).toBe(3);
  });

  it('offers no way to update a version row', () => {
    // The insert-only rule lives in application code: the domain exposes append
    // and material-edit operations and no update operation at all.
    const domain = jest.requireActual<Record<string, unknown>>(
      './offer-terms-version',
    );
    const updateLike = Object.keys(domain).filter((name) =>
      /update|replace|overwrite/i.test(name),
    );
    expect(updateLike).toEqual([]);
  });
});
