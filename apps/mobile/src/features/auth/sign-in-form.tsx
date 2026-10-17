import type { ComponentProps } from 'react';
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
import { textStyle } from '@/theme/typography';
import { useSignInForm } from './use-sign-in-form';

/**
 * gluestack's Heading types its `style` prop through `@expo/html-elements`,
 * whose web style clashes with React Native's `TextStyle`. The value is a plain
 * React Native text style, so the cast is only about the prop's declared type.
 */
const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

export function SignInForm() {
  const { control, onSubmit, errors, isSubmitting } = useSignInForm();

  return (
    <VStack className="w-full gap-6">
      <Heading style={TITLE_STYLE}>Sign in</Heading>

      <Controller
        control={control}
        name="identifier"
        rules={{ required: 'Enter your username or email' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.identifier)}>
            <FormControlLabel>
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Username or email
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                autoCapitalize="none"
                autoComplete="username"
                onBlur={onBlur}
                onChangeText={onChange}
                style={textStyle('body-md')}
                testID="sign-in-identifier"
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText style={textStyle('body-sm')}>
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
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Password
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                autoComplete="current-password"
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                style={textStyle('body-md')}
                testID="sign-in-password"
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText style={textStyle('body-sm')}>
                {errors.password?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      {errors.root ? (
        <Text className="text-destructive" style={textStyle('body-md')}>
          {errors.root.message}
        </Text>
      ) : null}

      <Button onPress={onSubmit} isDisabled={isSubmitting} testID="sign-in-submit">
        {isSubmitting ? <ButtonSpinner /> : null}
        <ButtonText style={textStyle('label-lg')}>Sign in</ButtonText>
      </Button>
    </VStack>
  );
}
