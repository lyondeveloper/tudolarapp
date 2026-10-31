import { act, renderHook } from '@testing-library/react-native';

import { usePublishOfferForm } from './use-publish-offer-form';

describe('usePublishOfferForm (Stitch 4.1 & ADR-0008, ADR-0009, ADR-0010, ADR-0018)', () => {
  it('initializes with a canonical pair, computes bolivar equivalence in tabular format, and validates margin and limits', async () => {
    const { result } = await renderHook(() => usePublishOfferForm());

    expect(result.current.values.pairId).toBe('VES_USD_CASH');
    expect(result.current.receiveRange.minReceiveFormatted).toBe('784,00');
    expect(result.current.receiveRange.maxReceiveFormatted).toBe('9.800,00');

    // Switch to invalid limits (min > max) and submit
    await act(async () => {
      result.current.setMinAmountText('500');
      result.current.setMaxAmountText('100');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.submittedPreview).toBe(false);
    expect(result.current.validationErrors.limits).toBeDefined();

    // Fix limits and submit -> preview confirmation enabled
    await act(async () => {
      result.current.setMinAmountText('20');
      result.current.setMaxAmountText('250');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.submittedPreview).toBe(true);
  });
});
