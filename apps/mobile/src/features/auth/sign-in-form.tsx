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

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

export function SignInForm() {
  const router = useRouter();
  const { control, onSubmit, errors, isSubmitting } = useSignInForm();
  const [passkeyNoticeVisible, setPasskeyNoticeVisible] = useState(false);

  return (
    <VStack className="w-full gap-5 pb-8">
      {/* ── Top Bar: Global Identity ─────────────────────────────── */}
      <Box className="flex-row items-center justify-between">
        <Box className="flex-row items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1.5 shadow-xs">
          <Text className="text-primary font-bold" style={textStyle('label-md')}>
            TUDOLAR • Cuenta Global
          </Text>
        </Box>
        <Box className="rounded-full bg-surface-muted px-2.5 py-1">
          <Text className="text-secondary font-medium" style={textStyle('label-sm')}>
            🔒 Red P2P
          </Text>
        </Box>
      </Box>

      {/* ── Hero Trust Card (Stitch 1.1) ─────────────────────────── */}
      <Box className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
        <VStack className="gap-2">
          <Box className="self-start rounded-md bg-surface-muted px-2 py-0.5">
            <Text className="text-secondary" style={textStyle('label-sm')}>
              Comunidad Verificada
            </Text>
          </Box>
          <Heading style={TITLE_STYLE}>Acceso Seguro P2P</Heading>
          <Text className="text-muted-foreground" style={textStyle('body-sm')}>
            Intercambio presencial de divisas y efectivo en puntos públicos vigilados.
          </Text>

          <Box className="mt-2 flex-row items-center justify-between border-t border-outline-variant pt-3">
            <Box className="flex-row items-center gap-1">
              <Text className="text-secondary" style={textStyle('label-sm')}>✓</Text>
              <Text className="text-foreground" style={textStyle('label-sm')}>
                Cifrado Local
              </Text>
            </Box>
            <Box className="h-1 w-1 rounded-full bg-outline" />
            <Box className="flex-row items-center gap-1">
              <Text className="text-primary" style={textStyle('label-sm')}>📍</Text>
              <Text className="text-foreground" style={textStyle('label-sm')}>
                Puntos Céntricos
              </Text>
            </Box>
            <Box className="h-1 w-1 rounded-full bg-outline" />
            <Box className="flex-row items-center gap-1">
              <Text className="text-secondary" style={textStyle('label-sm')}>🛡</Text>
              <Text className="text-foreground" style={textStyle('label-sm')}>
                Sin Custodia
              </Text>
            </Box>
          </Box>
        </VStack>
      </Box>

      {/* ── Authentication Card ───────────────────────────────────── */}
      <Box className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
        <VStack className="gap-4">
          {/* Quick Biometrics / Passkey */}
          <VStack className="gap-1.5">
            <Text className="text-foreground" style={textStyle('label-md')}>
              Entrada Biométrica Rápida (Passkey)
            </Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-outline bg-surface-muted px-4 py-2.5 active:bg-accent"
              onPress={() => setPasskeyNoticeVisible(true)}
              testID="sign-in-passkey-button"
            >
              <Text className="text-primary" style={textStyle('label-md')}>
                🔑 Entrar con Passkey / Huella o FaceID
              </Text>
            </Pressable>
            {passkeyNoticeVisible ? (
              <Box
                className="mt-1 rounded-lg border border-warning-border bg-warning p-2.5"
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

          {/* Divider */}
          <Box className="relative my-1 flex-row items-center justify-center">
            <Box className="h-[1px] flex-1 bg-outline-variant" />
            <Text
              className="bg-surface px-3 text-muted-foreground"
              style={textStyle('label-sm')}
            >
              o ingresa con tus credenciales
            </Text>
            <Box className="h-[1px] flex-1 bg-outline-variant" />
          </Box>

          {/* Form Fields */}
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
                <Input className="min-h-[48px] rounded-xl bg-surface-muted border-outline">
                  <InputField
                    autoCapitalize="none"
                    autoComplete="username"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="ej. usuario_ojeda o tu@correo.com"
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
                <Input className="min-h-[48px] rounded-xl bg-surface-muted border-outline">
                  <InputField
                    autoComplete="current-password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Ingresa tu contraseña"
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
            className="min-h-[50px] w-full rounded-xl bg-primary shadow-sm active:bg-primary/90"
            isDisabled={isSubmitting}
            onPress={onSubmit}
            testID="sign-in-submit"
          >
            {isSubmitting ? <ButtonSpinner /> : null}
            <ButtonText style={textStyle('label-lg')}>
              Sign in →
            </ButtonText>
          </Button>
        </VStack>
      </Box>

      {/* ── Civic Privacy Notice ──────────────────────────────────── */}
      <Box className="rounded-xl border border-warning-border bg-warning p-4 shadow-xs">
        <VStack className="gap-1">
          <Box className="flex-row items-center gap-1.5">
            <Text className="text-warning-foreground" style={textStyle('label-sm')}>
              🛡
            </Text>
            <Text
              className="text-warning-foreground font-semibold"
              style={textStyle('label-md')}
            >
              Compromiso de Privacidad Local
            </Text>
          </Box>
          <Text
            className="text-warning-foreground/90"
            style={textStyle('body-sm')}
          >
            Tus datos de contacto están protegidos y TUDOLAR no custodia fondos. Todos los acuerdos se realizan en puntos públicos de Ciudad Ojeda.
          </Text>
        </VStack>
      </Box>

      {/* ── Guest Explore Escape ──────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        className="min-h-[48px] items-center justify-center rounded-xl border border-outline bg-surface p-3.5 shadow-xs active:bg-surface-muted"
        onPress={() => router.push('/home')}
        testID="sign-in-guest-browse"
      >
        <Text className="text-primary font-semibold" style={textStyle('label-md')}>
          Explorar ofertas de Ciudad Ojeda como invitado →
        </Text>
      </Pressable>

      {/* ── Link to Register ──────────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        className="items-center py-2"
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
