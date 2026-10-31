import type { ComponentProps } from 'react';
import { Controller } from 'react-hook-form';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { BottomDock } from '@/features/marketplace/components/bottom-dock';
import { CivicNoticeBanner } from '@/features/marketplace/components/civic-notice-banner';
import {
  CANONICAL_PAIRS,
  CANONICAL_PAIR_IDS,
  CIUDAD_OJEDA_CORRIDORS,
  MVP_RAILS,
} from '@/features/marketplace/domain/catalog';
import { usePublishOfferForm } from '@/features/marketplace/use-publish-offer-form';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

export default function PublishScreen() {
  const {
    control,
    values,
    pair,
    receiveRange,
    validationErrors,
    submittedPreview,
    selectPair,
    selectCorridor,
    toggleRail,
    onSubmit,
  } = usePublishOfferForm();

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }}>
          <BottomDock activeTab="publish" />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <VStack className="w-full gap-4">
              <Box className="flex-row items-center justify-between rounded-md border border-border bg-surface p-3">
                <Text className="text-foreground" style={textStyle('label-md')}>
                  Mercado Activo: Ciudad Ojeda
                </Text>
                <Text className="text-secondary" style={textStyle('label-sm')}>
                  Habilitación Piloto Activa (ADR-0014)
                </Text>
              </Box>

              <VStack className="gap-1">
                <Heading style={TITLE_STYLE}>Publicar Oferta</Heading>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  Conecta con vecinos en Ciudad Ojeda con entrega en puntos públicos seguros.
                </Text>
              </VStack>

              <VStack className="gap-2">
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Par Canónico de la Operación (ADR-0009)
                </Text>
                <Box className="flex-row flex-wrap gap-1.5">
                  {CANONICAL_PAIR_IDS.map((pairId) => {
                    const selected = values.pairId === pairId;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={
                          selected
                            ? 'rounded-md bg-primary px-3 py-1.5'
                            : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                        }
                        key={pairId}
                        onPress={() => selectPair(pairId)}
                        testID={`publish-pair-${pairId}`}
                      >
                        <Text
                          className={
                            selected
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                          }
                          style={textStyle('label-sm')}
                        >
                          {CANONICAL_PAIRS[pairId].shortLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Box>
              </VStack>

              {!pair.sameAsset ? (
                <Controller
                  control={control}
                  name="rateText"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <FormControl>
                      <FormControlLabel>
                        <FormControlLabelText
                          className="text-foreground"
                          style={textStyle('label-md')}
                        >
                          Tasa de Cambio Definida por el Vendedor (ADR-0008)
                        </FormControlLabelText>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          keyboardType="decimal-pad"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          style={textStyle('code-num')}
                          testID="publish-rate-input"
                          value={value}
                        />
                      </Input>
                    </FormControl>
                  )}
                />
              ) : null}

              <Controller
                control={control}
                name="marginText"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormControl>
                    <FormControlLabel>
                      <FormControlLabelText
                        className="text-foreground"
                        style={textStyle('label-md')}
                      >
                        Margen Porcentual de Oferta (0 a &lt;100% • ADR-0010)
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        keyboardType="decimal-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        style={textStyle('code-num')}
                        testID="publish-margin-input"
                        value={value}
                      />
                    </Input>
                  </FormControl>
                )}
              />

              <Box className="flex-row gap-3">
                <Box className="flex-1">
                  <Controller
                    control={control}
                    name="minAmountText"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormControl>
                        <FormControlLabel>
                          <FormControlLabelText
                            className="text-foreground"
                            style={textStyle('label-md')}
                          >
                            {`Mínimo (${pair.giveAsset})`}
                          </FormControlLabelText>
                        </FormControlLabel>
                        <Input>
                          <InputField
                            keyboardType="decimal-pad"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            style={textStyle('code-num')}
                            testID="publish-min-input"
                            value={value}
                          />
                        </Input>
                      </FormControl>
                    )}
                  />
                </Box>

                <Box className="flex-1">
                  <Controller
                    control={control}
                    name="maxAmountText"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <FormControl>
                        <FormControlLabel>
                          <FormControlLabelText
                            className="text-foreground"
                            style={textStyle('label-md')}
                          >
                            {`Máximo (${pair.giveAsset})`}
                          </FormControlLabelText>
                        </FormControlLabel>
                        <Input>
                          <InputField
                            keyboardType="decimal-pad"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            style={textStyle('code-num')}
                            testID="publish-max-input"
                            value={value}
                          />
                        </Input>
                      </FormControl>
                    )}
                  />
                </Box>
              </Box>

              <Box className="rounded-md border border-border bg-surface p-3">
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  Equivalencia estimada a recibir:
                </Text>
                <Text className="text-primary" style={textStyle('code-num')}>
                  {`${receiveRange.minReceiveFormatted} – ${receiveRange.maxReceiveFormatted} ${receiveRange.receiveAsset}`}
                </Text>
              </Box>

              <VStack className="gap-2">
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Rieles de Liquidación Admitidos
                </Text>
                <Box className="flex-row flex-wrap gap-1.5">
                  {MVP_RAILS.map((rail) => {
                    const selected = values.rails.includes(rail);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={
                          selected
                            ? 'rounded-md bg-primary px-3 py-1.5'
                            : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                        }
                        key={rail}
                        onPress={() => toggleRail(rail)}
                        testID={`publish-rail-${rail}`}
                      >
                        <Text
                          className={
                            selected
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                          }
                          style={textStyle('label-sm')}
                        >
                          {rail}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Box>
              </VStack>

              <VStack className="gap-2">
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Punto de Encuentro Público Seguro en Ciudad Ojeda
                </Text>
                <Box className="flex-row flex-wrap gap-1.5">
                  {CIUDAD_OJEDA_CORRIDORS.map((corridor) => {
                    const selected = values.corridorId === corridor.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={
                          selected
                            ? 'rounded-md bg-primary px-3 py-1.5'
                            : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                        }
                        key={corridor.id}
                        onPress={() => selectCorridor(corridor.id)}
                        testID={`publish-corridor-${corridor.id}`}
                      >
                        <Text
                          className={
                            selected
                              ? 'text-primary-foreground'
                              : 'text-foreground'
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

              {Object.values(validationErrors).map((err) =>
                err ? (
                  <Text
                    className="text-destructive"
                    key={err}
                    style={textStyle('body-sm')}
                  >
                    {err}
                  </Text>
                ) : null,
              )}

              {submittedPreview ? (
                <CivicNoticeBanner
                  body="Vista previa T15: Tu borrador cumple las reglas de pares y límites. La persistencia en base de datos se conecta cuando aterricen los endpoints de T09/T17."
                  testID="publish-preview-confirmation"
                  title="Oferta Validada en Modo Vista Previa"
                />
              ) : null}

              <CivicNoticeBanner
                body="Horario Sugerido: 9:00 AM – 4:00 PM. TUDOLAR no custodia dinero ni media en el efectivo."
                testID="publish-non-custody-disclaimer"
                title="Plataforma Cívica Sin Custodia"
              />

              <Button
                onPress={() => {
                  void onSubmit();
                }}
                testID="publish-offer-submit"
              >
                <ButtonText style={textStyle('label-lg')}>
                  Publicar Oferta en Ojeda
                </ButtonText>
              </Button>
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
