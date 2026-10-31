import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
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
import { OfferCard } from '@/features/marketplace/components/offer-card';
import {
  CANONICAL_PAIRS,
  CANONICAL_PAIR_IDS,
  CIUDAD_OJEDA_CORRIDORS,
  MVP_RAILS,
  filterOffers,
  type CanonicalPairId,
  type MvpRail,
} from '@/features/marketplace/domain/catalog';
import { OFFERS_PREVIEW } from '@/features/marketplace/domain/preview-data';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

interface SearchFilterFormValues {
  pairId: CanonicalPairId | 'ALL';
  rail: MvpRail | 'ALL';
  amountText: string;
  corridorId: string | 'ALL';
}

export default function SearchScreen() {
  const router = useRouter();
  const { control, setValue, watch } = useForm<SearchFilterFormValues>({
    defaultValues: {
      pairId: 'ALL',
      rail: 'ALL',
      amountText: '',
      corridorId: 'ALL',
    },
  });

  const values = watch();
  const parsedAmount = Number(values.amountText.replace(',', '.'));
  const matches = filterOffers(OFFERS_PREVIEW, {
    pairId: values.pairId,
    rail: values.rail,
    amount:
      values.amountText.trim().length > 0 && Number.isFinite(parsedAmount)
        ? parsedAmount
        : null,
    corridorId: values.corridorId,
    maxDistanceKm: 5,
  });

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }}>
          <BottomDock activeTab="search" />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <VStack className="w-full gap-4">
              <VStack className="gap-1">
                <Heading style={TITLE_STYLE} testID="search-screen-heading">
                  Búsqueda Determinística de Ofertas
                </Heading>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  Mercado Activo: Ciudad Ojeda • Radio máximo 5 km
                </Text>
              </VStack>

              <CivicNoticeBanner
                body="ADR-0015: La búsqueda en lenguaje natural con IA está diferida en el MVP. Utiliza los filtros manuales determinísticos verificados dentro del polígono de Ciudad Ojeda."
                testID="search-ai-deferral-notice"
                title="Transparencia TUDOLAR: Filtros Determinísticos Activos"
              />

              <VStack className="gap-2">
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Par Transaccional (5 pares canónicos MVP)
                </Text>
                <Box className="flex-row flex-wrap gap-1.5">
                  <Pressable
                    accessibilityRole="button"
                    className={
                      values.pairId === 'ALL'
                        ? 'rounded-md bg-primary px-3 py-1.5'
                        : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                    }
                    onPress={() => setValue('pairId', 'ALL')}
                    testID="search-pair-ALL"
                  >
                    <Text
                      className={
                        values.pairId === 'ALL'
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                      style={textStyle('label-sm')}
                    >
                      Todos
                    </Text>
                  </Pressable>
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
                        onPress={() => setValue('pairId', pairId)}
                        testID={`search-pair-${pairId}`}
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

              <Controller
                control={control}
                name="amountText"
                render={({ field: { onChange, onBlur, value } }) => (
                  <FormControl>
                    <FormControlLabel>
                      <FormControlLabelText
                        className="text-foreground"
                        style={textStyle('label-md')}
                      >
                        Monto solicitado (dentro del rango de la oferta)
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        keyboardType="decimal-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="Ej. 100"
                        style={textStyle('body-md')}
                        testID="search-amount-input"
                        value={value}
                      />
                    </Input>
                  </FormControl>
                )}
              />

              <VStack className="gap-2">
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Riel de Pago Admitido
                </Text>
                <Box className="flex-row flex-wrap gap-1.5">
                  <Pressable
                    accessibilityRole="button"
                    className={
                      values.rail === 'ALL'
                        ? 'rounded-md bg-primary px-3 py-1.5'
                        : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                    }
                    onPress={() => setValue('rail', 'ALL')}
                    testID="search-rail-ALL"
                  >
                    <Text
                      className={
                        values.rail === 'ALL'
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                      style={textStyle('label-sm')}
                    >
                      Todos los rieles
                    </Text>
                  </Pressable>
                  {MVP_RAILS.map((rail) => {
                    const selected = values.rail === rail;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={
                          selected
                            ? 'rounded-md bg-primary px-3 py-1.5'
                            : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                        }
                        key={rail}
                        onPress={() => setValue('rail', rail)}
                        testID={`search-rail-${rail}`}
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
                  Corredor Público en Ciudad Ojeda
                </Text>
                <Box className="flex-row flex-wrap gap-1.5">
                  <Pressable
                    accessibilityRole="button"
                    className={
                      values.corridorId === 'ALL'
                        ? 'rounded-md bg-primary px-3 py-1.5'
                        : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                    }
                    onPress={() => setValue('corridorId', 'ALL')}
                    testID="search-corridor-ALL"
                  >
                    <Text
                      className={
                        values.corridorId === 'ALL'
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                      style={textStyle('label-sm')}
                    >
                      Todo Ciudad Ojeda
                    </Text>
                  </Pressable>
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
                        onPress={() => setValue('corridorId', corridor.id)}
                        testID={`search-corridor-${corridor.id}`}
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

              <Text
                className="text-foreground"
                style={textStyle('headline-sm')}
              >
                {`Coincidencias encontradas (${matches.length})`}
              </Text>

              {matches.length === 0 ? (
                <Box
                  className="rounded-md border border-border bg-surface p-4"
                  testID="search-empty-state"
                >
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-md')}
                  >
                    No hay ofertas que coincidan con estos parámetros dentro de Ciudad Ojeda.
                  </Text>
                </Box>
              ) : (
                <VStack className="gap-3">
                  {matches.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onSelect={(offerId) => router.push(`/offers/${offerId}`)}
                    />
                  ))}
                </VStack>
              )}
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
