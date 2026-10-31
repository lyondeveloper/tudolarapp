import { useRouter } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Controller } from 'react-hook-form';

import { Box } from '@/components/ui/box';
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
import { Pressable } from '@/components/ui/pressable';
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
  const router = useRouter();
  const { control, onSubmit, errors, isSubmitting } = useSignInForm();
  const [passkeyNoticeVisible, setPasskeyNoticeVisible] = useState(false);

  return (
    <VStack className="w-full gap-4">
      <Box className="self-start rounded-md border border-outline bg-surface-muted px-2.5 py-1">
        <Text className="text-primary" style={textStyle('label-sm')}>
          Nodo Activo: Ciudad Ojeda • Sin Custodia
        </Text>
      </Box>

      <VStack className="gap-1">
        <Heading style={TITLE_STYLE}>Sign in</Heading>
        <Text className="text-muted-foreground" style={textStyle('body-sm')}>
          Acceso Seguro P2P • Intercambio presencial en puntos públicos de Ciudad Ojeda
        </Text>
      </VStack>

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

      <Button
        isDisabled={isSubmitting}
        onPress={onSubmit}
        testID="sign-in-submit"
      >
        {isSubmitting ? <ButtonSpinner /> : null}
        <ButtonText style={textStyle('label-lg')}>Sign in</ButtonText>
      </Button>

      <Box className="rounded-md border border-border bg-surface p-3">
        <VStack className="gap-2">
          <Text className="text-foreground" style={textStyle('label-md')}>
            Entrada Biométrica Rápida (Passkey)
          </Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-md border border-outline bg-surface-muted px-3 py-2"
            onPress={() => setPasskeyNoticeVisible(true)}
            testID="sign-in-passkey-button"
          >
            <Text className="text-primary" style={textStyle('label-md')}>
              Entrar con Passkey / Huella o FaceID
            </Text>
          </Pressable>
          {passkeyNoticeVisible ? (
            <Box
              className="rounded-sm border border-warning-border bg-warning p-2"
              testID="passkey-preview-notice"
            >
              <Text
                className="text-warning-foreground"
                style={textStyle('body-sm')}
              >
                Vista previa T15: La ceremonia nativa de Passkey se integra en T16. Usa tus credenciales abajo.
              </Text>
            </Box>
          ) : null}
        </VStack>
      </Box>

      <Box className="rounded-md border border-border bg-surface-muted p-3">
        <VStack className="gap-1">
          <Text className="text-foreground" style={textStyle('label-sm')}>
            Compromiso de Privacidad Local
          </Text>
          <Text
            className="text-muted-foreground"
            style={textStyle('body-sm')}
          >
            Tus datos de contacto están protegidos y TUDOLAR no custodia fondos.
          </Text>
        </VStack>
      </Box>

      <Pressable
        accessibilityRole="button"
        className="items-center py-1"
        onPress={() => router.push('/register')}
        testID="sign-in-go-to-register"
      >
        <Text className="text-primary" style={textStyle('label-md')}>
          ¿No tienes una cuenta en TUDOLAR? Regístrate aquí
        </Text>
      </Pressable>
    </VStack>
  );
}
