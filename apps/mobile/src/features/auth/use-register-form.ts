import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRegisterWithPasswordMutation } from '@/services/api';

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
  const [registerWithPassword] = useRegisterWithPasswordMutation();
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerWithPassword({
        displayName: values.displayName.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
      }).unwrap();
      setRegistrationSubmitted(true);
    } catch {
      setError('root', {
        message:
          'No se pudo completar el registro. Verifica los datos o intenta más tarde.',
      });
    }
  });

  return {
    control,
    errors,
    isSubmitting,
    registrationSubmitted,
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
