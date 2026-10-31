import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  CANONICAL_PAIRS,
  calculateReceiveRange,
  validateOfferDraft,
  type CanonicalPairId,
  type MvpRail,
  type OfferDraftValidationResult,
} from './domain/catalog';

export interface PublishOfferFormValues {
  pairId: CanonicalPairId;
  rateText: string;
  marginText: string;
  minAmountText: string;
  maxAmountText: string;
  rails: MvpRail[];
  corridorId: string;
}

export function usePublishOfferForm() {
  const [submittedPreview, setSubmittedPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    OfferDraftValidationResult['errors']
  >({});

  const { control, setValue, watch } = useForm<PublishOfferFormValues>({
    defaultValues: {
      pairId: 'VES_USD_CASH',
      rateText: '39.20',
      marginText: '0',
      minAmountText: '20',
      maxAmountText: '250',
      rails: ['VES_BANK_TRANSFER'],
      corridorId: 'ojeda-mall',
    },
  });

  const values = watch();
  const pair = CANONICAL_PAIRS[values.pairId];
  const parsedRate = Number(values.rateText.replace(',', '.'));
  const parsedMargin = Number(values.marginText.replace(',', '.'));
  const parsedMin = Number(values.minAmountText.replace(',', '.'));
  const parsedMax = Number(values.maxAmountText.replace(',', '.'));

  const receiveRange = calculateReceiveRange({
    pairId: values.pairId,
    minGiveAmount: Number.isFinite(parsedMin) ? parsedMin : 0,
    maxGiveAmount: Number.isFinite(parsedMax) ? parsedMax : 0,
    rate: pair.sameAsset
      ? null
      : Number.isFinite(parsedRate)
        ? parsedRate
        : null,
    marginPercent: Number.isFinite(parsedMargin) ? parsedMargin : 0,
  });

  const toggleRail = (rail: MvpRail) => {
    const exists = values.rails.includes(rail);
    const nextRails = exists
      ? values.rails.filter((item) => item !== rail)
      : [...values.rails, rail];
    setValue('rails', nextRails);
  };

  const onSubmit = async () => {
    const check = validateOfferDraft({
      pairId: values.pairId,
      rate: pair.sameAsset ? null : parsedRate,
      marginPercent: Number.isFinite(parsedMargin) ? parsedMargin : -1,
      minAmount: parsedMin,
      maxAmount: parsedMax,
      rails: values.rails,
      corridorId: values.corridorId,
    });

    setValidationErrors(check.errors);
    if (check.valid) {
      setSubmittedPreview(true);
    } else {
      setSubmittedPreview(false);
    }
  };

  return {
    control,
    values,
    pair,
    receiveRange,
    validationErrors,
    submittedPreview,
    selectPair: (pairId: CanonicalPairId) => setValue('pairId', pairId),
    setRateText: (text: string) => setValue('rateText', text),
    setMarginText: (text: string) => setValue('marginText', text),
    setMinAmountText: (text: string) => setValue('minAmountText', text),
    setMaxAmountText: (text: string) => setValue('maxAmountText', text),
    selectCorridor: (corridorId: string) => setValue('corridorId', corridorId),
    toggleRail,
    onSubmit,
  };
}
