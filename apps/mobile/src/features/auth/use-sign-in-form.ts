import { useForm } from 'react-hook-form';
import { writeRefreshToken } from '@/features/session/secure-session-storage';
import { sessionEstablished } from '@/features/session/session-slice';
import { useSignInWithPasswordMutation } from '@/services/api';
import { useAppDispatch } from '@/store/hooks';

export interface SignInFormValues {
  identifier: string;
  password: string;
}

export function useSignInForm() {
  const dispatch = useAppDispatch();
  const [signInWithPassword] = useSignInWithPasswordMutation();
  const { control, handleSubmit, formState, setError } =
    useForm<SignInFormValues>({
      defaultValues: { identifier: '', password: '' },
    });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const tokens = await signInWithPassword(values).unwrap();
      await writeRefreshToken(tokens.refreshToken);
      dispatch(sessionEstablished({ accessToken: tokens.accessToken }));
    } catch {
      // The API returns the same error for an unknown account and a wrong
      // password, so the form must not distinguish them either.
      setError('root', { message: 'Invalid credentials' });
    }
  });

  return {
    control,
    onSubmit,
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
  };
}
