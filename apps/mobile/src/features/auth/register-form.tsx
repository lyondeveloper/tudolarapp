import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Controller } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
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
import { CivicNoticeBanner } from '@/features/marketplace/components/civic-notice-banner';
import { CIUDAD_OJEDA_CORRIDORS } from '@/features/marketplace/domain/catalog';
import { textStyle } from '@/theme/typography';
import { useRegisterForm } from './use-register-form';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

export function RegisterForm() {
  const router = useRouter();
  const {
    control,
    errors,
    isSubmitting,
    submittedPreview,
    frequentSector,
    acceptedCivicPact,
    selectSector,
    toggleCivicPact,
    onSubmit,
  } = useRegisterForm();

  return (
    <VStack className="w-full gap-4">
      <Box className="self-start rounded-md border border-outline bg-surface-muted px-2.5 py-1">
        <Text className="text-primary" style={textStyle('label-sm')}>
          Registro Comunitario • Ciudad Ojeda
        </Text>
      </Box>

      <VStack className="gap-1">
        <Heading style={TITLE_STYLE}>Datos y Verificación Cívica</Heading>
        <Text className="text-muted-foreground" style={textStyle('body-sm')}>
          Construimos una red confiable para acuerdos presenciales en puntos públicos de Ciudad Ojeda.
        </Text>
      </VStack>

      <Controller
        control={control}
        name="displayName"
        rules={{ required: 'Ingresa tu nombre completo' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.displayName)}>
            <FormControlLabel>
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Nombre y Apellido
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                onBlur={onBlur}
                onChangeText={onChange}
                style={textStyle('body-md')}
                testID="register-display-name"
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText style={textStyle('body-sm')}>
                {errors.displayName?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      <Controller
        control={control}
        name="username"
        rules={{ required: 'Ingresa un nombre de usuario' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.username)}>
            <FormControlLabel>
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Nombre de Usuario
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                style={textStyle('body-md')}
                testID="register-username"
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText style={textStyle('body-sm')}>
                {errors.username?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      <Controller
        control={control}
        name="email"
        rules={{ required: 'Ingresa tu correo electrónico' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.email)}>
            <FormControlLabel>
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Correo Electrónico
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                autoCapitalize="none"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                style={textStyle('body-md')}
                testID="register-email"
                value={value}
              />
            </Input>
            <FormControlError>
              <FormControlErrorText style={textStyle('body-sm')}>
                {errors.email?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      <Controller
        control={control}
        name="phoneNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Teléfono de Contacto (Opcional • Protegido)
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                style={textStyle('body-md')}
                testID="register-phone"
                value={value}
              />
            </Input>
          </FormControl>
        )}
      />

      <VStack className="gap-1.5">
        <Text className="text-foreground" style={textStyle('label-md')}>
          Sector Frecuente en Ciudad Ojeda
        </Text>
        <Box className="flex-row flex-wrap gap-1.5">
          {CIUDAD_OJEDA_CORRIDORS.map((corridor) => {
            const selected = frequentSector === corridor.id;
            return (
              <Pressable
                accessibilityRole="button"
                className={
                  selected
                    ? 'rounded-md bg-primary px-3 py-1.5'
                    : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                }
                key={corridor.id}
                onPress={() => selectSector(corridor.id)}
                testID={`register-sector-${corridor.id}`}
              >
                <Text
                  className={
                    selected ? 'text-primary-foreground' : 'text-foreground'
                  }
                  style={textStyle('label-sm')}
                >
                  {corridor.name}
                </Text>
              </Pressable>
            );
          })}
        </Box>
      </VStack>

      <Controller
        control={control}
        name="password"
        rules={{ required: 'Ingresa una contraseña de respaldo' }}
        render={({ field: { onChange, onBlur, value } }) => (
          <FormControl isInvalid={Boolean(errors.password)}>
            <FormControlLabel>
              <FormControlLabelText
                className="text-foreground"
                style={textStyle('label-md')}
              >
                Contraseña de Respaldo
              </FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                style={textStyle('body-md')}
                testID="register-password"
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

      <Controller
        control={control}
        name="acceptedCivicPact"
        rules={{
          validate: (val) =>
            val === true || 'Debes aceptar el Pacto de Confianza Ojeda',
        }}
        render={() => (
          <FormControl isInvalid={Boolean(errors.acceptedCivicPact)}>
            <Box className="rounded-md border border-border bg-surface p-3">
              <VStack className="gap-2">
                <Text className="text-foreground" style={textStyle('label-lg')}>
                  Pacto de Confianza Ojeda
                </Text>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  1. Sitio Público Concurrido: Encuentros solo diurnos en centros comerciales o zonas bancarias.
                </Text>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  2. Cero Intermediarios: Pago Móvil o entrega en efectivo directa cara a cara.
                </Text>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  3. No Custodia: TUDOLAR conecta personas, no retiene dinero ni procesa transferencias.
                </Text>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedCivicPact }}
                  className="flex-row items-center gap-2 rounded-md border border-outline bg-surface-muted p-2.5"
                  onPress={toggleCivicPact}
                  testID="register-pact-checkbox"
                >
                  <Box
                    className={
                      acceptedCivicPact
                        ? 'h-5 w-5 rounded-sm bg-secondary'
                        : 'h-5 w-5 rounded-sm border border-outline bg-surface'
                    }
                  />
                  <Text
                    className="flex-1 text-foreground"
                    style={textStyle('label-md')}
                  >
                    He leído y acepto el pacto cívico y el aviso de no custodia
                  </Text>
                </Pressable>
              </VStack>
            </Box>
            <FormControlError>
              <FormControlErrorText style={textStyle('body-sm')}>
                {errors.acceptedCivicPact?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        )}
      />

      {submittedPreview ? (
        <CivicNoticeBanner
          body="Vista previa T15: Los endpoints de registro y verificación se integran en T06/T16. Puedes iniciar sesión con la cuenta de demostración."
          testID="register-preview-confirmation"
          title="Solicitud de Registro en Modo Vista Previa"
        />
      ) : null}

      <Button
        isDisabled={isSubmitting}
        onPress={onSubmit}
        testID="register-submit"
      >
        <ButtonText style={textStyle('label-lg')}>
          Continuar a Verificación
        </ButtonText>
      </Button>

      <Pressable
        accessibilityRole="button"
        className="items-center py-1"
        onPress={() => router.replace('/sign-in')}
        testID="register-back-to-sign-in"
      >
        <Text className="text-primary" style={textStyle('label-md')}>
          ¿Ya formas parte de la red? Iniciar Sesión
        </Text>
      </Pressable>
    </VStack>
  );
}
