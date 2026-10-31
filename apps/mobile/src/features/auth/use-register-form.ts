import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

export interface RegisterFormValues {
  displayName: string;
  username: string;
  email: string;
  phoneNumber: string;
  frequentSector: string;
  password: string;
  acceptedCivicPact: boolean;
}

export function useRegisterForm() {
  const [submittedPreview, setSubmittedPreview] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      phoneNumber: '',
      frequentSector: 'ojeda-mall',
      password: '',
      acceptedCivicPact: false,
    },
  });

  const frequentSector =
    useWatch({ control, name: 'frequentSector' }) ?? 'ojeda-mall';
  const acceptedCivicPact =
    useWatch({ control, name: 'acceptedCivicPact' }) ?? false;

  const onSubmit = handleSubmit(() => {
    setSubmittedPreview(true);
  });

  return {
    control,
    errors,
    isSubmitting,
    submittedPreview,
    frequentSector,
    acceptedCivicPact,
    selectSector: (sectorId: string) =>
      setValue('frequentSector', sectorId, { shouldValidate: true }),
    toggleCivicPact: () =>
      setValue('acceptedCivicPact', !acceptedCivicPact, {
        shouldValidate: true,
      }),
    onSubmit,
  };
}
