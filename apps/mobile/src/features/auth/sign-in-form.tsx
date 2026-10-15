import { Controller } from 'react-hook-form';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useSignInForm } from './use-sign-in-form';

export function SignInForm() {
  const { control, onSubmit, errors, isSubmitting } = useSignInForm();

  return (
    <VStack className="w-full gap-6">
      <Heading size="xl">Sign in</Heading>

      <Controller
        control={control}
        name="identifier"
        rules={{ required: 'Enter your username or email' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.identifier)}>
            <FormControlLabel>
              <FormControlLabelText>Username or email</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                autoCapitalize="none"
                autoComplete="username"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText>
                {errors.identifier?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: 'Enter your password' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.password)}>
            <FormControlLabel>
              <FormControlLabelText>Password</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                autoComplete="current-password"
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText>
                {errors.password?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      {errors.root ? (
        <Text className="text-destructive">{errors.root.message}</Text>
      ) : null}

      <Button onPress={onSubmit} isDisabled={isSubmitting}>
        {isSubmitting ? <ButtonSpinner /> : null}
        <ButtonText>Sign in</ButtonText>
      </Button>
    </VStack>
  );
}
