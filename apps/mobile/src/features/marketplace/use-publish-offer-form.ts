import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { usePublishOfferMutation } from '@/services/api';
import {
  CANONICAL_PAIRS,
  CIUDAD_OJEDA_CORRIDORS,
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

const DEFAULT_PUBLISH_VALUES: PublishOfferFormValues = {
  pairId: 'VES_USD_CASH',
  rateText: '39.20',
  marginText: '0',
  minAmountText: '20',
  maxAmountText: '250',
  rails: ['VES_BANK_TRANSFER'],
  corridorId: 'ojeda-mall',
};

export function usePublishOfferForm() {
  const [publishOffer, { isLoading: isPublishing, error: publishApiError }] =
    usePublishOfferMutation();
  const [submittedPreview, setSubmittedPreview] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    OfferDraftValidationResult['errors']
  >({});

  const { control, setValue } = useForm<PublishOfferFormValues>({
    defaultValues: DEFAULT_PUBLISH_VALUES,
  });

  const watched = useWatch({ control });
  const values: PublishOfferFormValues = {
    pairId: watched.pairId ?? DEFAULT_PUBLISH_VALUES.pairId,
    rateText: watched.rateText ?? DEFAULT_PUBLISH_VALUES.rateText,
    marginText: watched.marginText ?? DEFAULT_PUBLISH_VALUES.marginText,
    minAmountText:
      watched.minAmountText ?? DEFAULT_PUBLISH_VALUES.minAmountText,
    maxAmountText:
      watched.maxAmountText ?? DEFAULT_PUBLISH_VALUES.maxAmountText,
    rails: watched.rails ?? DEFAULT_PUBLISH_VALUES.rails,
    corridorId: watched.corridorId ?? DEFAULT_PUBLISH_VALUES.corridorId,
  };
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
      const corridor =
        CIUDAD_OJEDA_CORRIDORS.find((c) => c.id === values.corridorId) ??
        CIUDAD_OJEDA_CORRIDORS[0];

      try {
        await publishOffer({
          pairId: values.pairId,
          initialAmount: String(parsedMax),
          giveAmount: String(parsedMax),
          receiveAmount: String(
            receiveRange.maxReceiveFormatted.replace(/\./g, '').replace(',', '.'),
          ),
          minAmount: String(parsedMin),
          maxAmount: String(parsedMax),
          rate: pair.sameAsset ? null : String(parsedRate),
          marginPct: String(parsedMargin),
          description: `Oferta en ${corridor.name}`,
          details: `Encuentro en ${corridor.name}. Horario: ${corridor.scheduleLabel}`,
          location: corridor.location,
        }).unwrap();
        setPublishSuccess(true);
      } catch {
        // Fall back gracefully when offline or mock mode
      }
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
    publishSuccess,
    isPublishing,
    publishApiError,
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
