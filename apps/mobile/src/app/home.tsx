import { useRouter } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { BottomDock } from '@/features/marketplace/components/bottom-dock';
import { CivicNoticeBanner } from '@/features/marketplace/components/civic-notice-banner';
import { MarketNodeBanner } from '@/features/marketplace/components/market-node-banner';
import { OfferCard } from '@/features/marketplace/components/offer-card';
import {
  CANONICAL_PAIRS,
  CANONICAL_PAIR_IDS,
  filterOffers,
  type CanonicalPairId,
} from '@/features/marketplace/domain/catalog';
import { OFFERS_PREVIEW } from '@/features/marketplace/domain/preview-data';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { useCurrentUserQuery } from '@/services/api';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

const FILTER_OPTIONS: readonly {
  id: CanonicalPairId | 'ALL';
  label: string;
}[] = [
  { id: 'ALL', label: 'Todas las Ofertas' },
  ...CANONICAL_PAIR_IDS.map((id) => ({
    id,
    label: CANONICAL_PAIRS[id].shortLabel,
  })),
];

/**
 * Stitch 2.1 — Descubrimiento de Ofertas - Mercado Ojeda.
 *
 * Keeps the authenticated user summary (`Signed in`, `user.displayName`, and
 * `identity`) read from `GET /users/me` while rendering the Ciudad Ojeda
 * marketplace discovery feed, deterministic pair filter chips, list/map view
 * switcher, P2P offer cards, permanent non-custody notice, and bottom dock.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUserQuery();
  const [selectedPair, setSelectedPair] = useState<CanonicalPairId | 'ALL'>(
    'ALL',
  );
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const identity = user?.username ?? user?.email ?? null;
  const visibleOffers = filterOffers(OFFERS_PREVIEW, { pairId: selectedPair });

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }}>
          <BottomDock activeTab="offers" />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <VStack className="w-full gap-4">
              <Box className="flex-row items-center justify-between rounded-md border border-border bg-surface p-3">
                <VStack className="flex-1 gap-0.5">
                  <Box className="flex-row items-center gap-2">
                    <Heading style={TITLE_STYLE}>Signed in</Heading>
                    <Box className="rounded-sm bg-surface-muted px-2 py-0.5">
                      <Text
                        className="text-secondary"
                        style={textStyle('label-sm')}
                      >
                        Sin custodia • P2P directo
                      </Text>
                    </Box>
                  </Box>

                  {isLoading ? <Spinner /> : null}

                  {isError ? (
                    <Text
                      className="text-destructive"
                      style={textStyle('body-md')}
                    >
                      Could not load your profile.
                    </Text>
                  ) : null}

                  {user ? (
                    <Box className="flex-row items-center gap-2">
                      <Text
                        className="text-foreground"
                        style={textStyle('body-lg')}
                      >
                        {user.displayName}
                      </Text>
                      {identity ? (
                        <Text
                          className="text-muted-foreground"
                          style={textStyle('body-md')}
                        >
                          {identity}
                        </Text>
                      ) : null}
                    </Box>
                  ) : null}
                </VStack>
              </Box>

              <MarketNodeBanner />

              <VStack className="gap-2">
                <Box className="flex-row items-center justify-between">
                  <Text
                    className="text-foreground"
                    style={textStyle('label-md')}
                  >
                    Filtrar por par canónico (Radio &lt; 5 km)
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/search')}
                    testID="home-open-search"
                  >
                    <Text
                      className="text-primary"
                      style={textStyle('label-sm')}
                    >
                      Búsqueda avanzada
                    </Text>
                  </Pressable>
                </Box>

                <Box className="flex-row flex-wrap gap-1.5">
                  {FILTER_OPTIONS.map((option) => {
                    const active = selectedPair === option.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={
                          active
                            ? 'rounded-md bg-primary px-3 py-1.5'
                            : 'rounded-md border border-outline bg-surface-muted px-3 py-1.5'
                        }
                        key={option.id}
                        onPress={() => setSelectedPair(option.id)}
                        testID={`home-filter-${option.id}`}
                      >
                        <Text
                          className={
                            active
                              ? 'text-primary-foreground'
                              : 'text-foreground'
                          }
                          style={textStyle('label-sm')}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Box>
              </VStack>

              <Box className="flex-row items-center justify-between">
                <Text
                  className="text-muted-foreground"
                  style={textStyle('label-md')}
                >
                  {`${visibleOffers.length} ofertas disponibles hoy en Ciudad Ojeda`}
                </Text>

                <Box className="flex-row gap-1">
                  <Pressable
                    accessibilityRole="button"
                    className={
                      viewMode === 'list'
                        ? 'rounded-sm bg-primary px-2.5 py-1'
                        : 'rounded-sm bg-surface-muted px-2.5 py-1'
                    }
                    onPress={() => setViewMode('list')}
                    testID="home-view-list"
                  >
                    <Text
                      className={
                        viewMode === 'list'
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                      style={textStyle('label-sm')}
                    >
                      Lista
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className={
                      viewMode === 'map'
                        ? 'rounded-sm bg-primary px-2.5 py-1'
                        : 'rounded-sm bg-surface-muted px-2.5 py-1'
                    }
                    onPress={() => setViewMode('map')}
                    testID="home-view-map"
                  >
                    <Text
                      className={
                        viewMode === 'map'
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                      style={textStyle('label-sm')}
                    >
                      Mapa Ojeda
                    </Text>
                  </Pressable>
                </Box>
              </Box>

              {viewMode === 'map' ? (
                <Box
                  className="rounded-md border border-border bg-surface p-4"
                  testID="home-map-preview"
                >
                  <VStack className="gap-1">
                    <Text
                      className="text-foreground"
                      style={textStyle('headline-sm')}
                    >
                      Corredores Seguros de Ciudad Ojeda
                    </Text>
                    <Text
                      className="text-muted-foreground"
                      style={textStyle('body-sm')}
                    >
                      Vista previa geocercada del Municipio Lagunillas (Radio por defecto 5 km): CC Ojeda Mall, Plaza Bolívar y Sector Las Morochas.
                    </Text>
                  </VStack>
                </Box>
              ) : null}

              <VStack className="gap-3">
                {visibleOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onSelect={(offerId) => router.push(`/offers/${offerId}`)}
                  />
                ))}
              </VStack>

              <CivicNoticeBanner
                body="TUDOLAR conecta vecinos en Ciudad Ojeda sin custodiar dinero ni cobrar comisiones por intercambio. Todo acuerdo es de mutuo consentimiento en sitios públicos vigilados y horario diurno."
                testID="home-civic-disclaimer"
                title="Compromiso Comunitario y Cero Custodia"
              />
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
