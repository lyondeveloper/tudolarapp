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
 * Renders the clean Ciudad Ojeda marketplace discovery feed for authenticated
 * users, with a modal-driven pair filter, P2P offer cards, non-custody civic
 * disclaimer, and anchored bottom dock.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUserQuery();

  const [selectedPair, setSelectedPair] = useState<CanonicalPairId | 'ALL'>(
    'ALL',
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const identity = user?.username ?? user?.email ?? null;
  const visibleOffers = filterOffers(OFFERS_PREVIEW, { pairId: selectedPair });

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <VStack className="w-full gap-4">
              {/* ── User Status Header ────────────────────────────────── */}
              <Box className="flex-row items-center justify-between rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm">
                <VStack className="flex-1 gap-1">
                  <Box className="flex-row items-center gap-2">
                    <Heading style={TITLE_STYLE}>Signed in</Heading>
                    <Box className="rounded-full bg-secondary/10 px-2.5 py-0.5">
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

              {/* ── Active Market Node Banner ─────────────────────────── */}
              <MarketNodeBanner />

              {/* ── Search & Filter Trigger Bar ───────────────────────── */}
              <Box className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-between rounded-xl border border-outline bg-surface px-4 py-3 shadow-xs active:bg-surface-muted"
                  onPress={() => setIsFilterOpen(true)}
                  testID="home-filter-trigger"
                >
                  <Box className="flex-row items-center gap-2">
                    <Text style={textStyle('label-md')}>🔍</Text>
                    <Text
                      className={
                        selectedPair === 'ALL'
                          ? 'text-muted-foreground'
                          : 'text-primary font-semibold'
                      }
                      style={textStyle('label-md')}
                    >
                      {selectedPair === 'ALL'
                        ? 'Filtrar por par canónico...'
                        : `Filtro: ${CANONICAL_PAIRS[selectedPair].shortLabel}`}
                    </Text>
                  </Box>
                  <Box className="rounded-md bg-surface-muted px-2 py-0.5">
                    <Text
                      className="text-primary font-medium"
                      style={textStyle('label-sm')}
                    >
                      {selectedPair === 'ALL' ? 'Filtros ⚙️' : 'Cambiar'}
                    </Text>
                  </Box>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  className="rounded-xl border border-outline bg-surface p-3 shadow-xs active:bg-surface-muted"
                  onPress={() => router.push('/search')}
                  testID="home-open-search"
                >
                  <Text
                    className="text-primary font-semibold"
                    style={textStyle('label-sm')}
                  >
                    Avanzada
                  </Text>
                </Pressable>
              </Box>

              {/* ── Counter & Active Filter Reset ─────────────────────── */}
              <Box className="flex-row items-center justify-between">
                <Text
                  className="text-muted-foreground"
                  style={textStyle('label-md')}
                >
                  {`${visibleOffers.length} ofertas disponibles hoy en Ciudad Ojeda`}
                </Text>

                {selectedPair !== 'ALL' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedPair('ALL')}
                    testID="home-filter-clear"
                  >
                    <Text
                      className="text-primary font-medium"
                      style={textStyle('label-sm')}
                    >
                      Limpiar filtro
                    </Text>
                  </Pressable>
                ) : null}
              </Box>

              {/* ── Offers Feed ───────────────────────────────────────── */}
              <VStack className="gap-3">
                {visibleOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onSelect={(offerId) => router.push(`/offers/${offerId}`)}
                  />
                ))}
              </VStack>

              {/* ── Civic Non-Custody Notice ──────────────────────────── */}
              <CivicNoticeBanner
                body="TUDOLAR conecta vecinos en Ciudad Ojeda sin custodiar dinero ni cobrar comisiones por intercambio. Todo acuerdo es de mutuo consentimiento en sitios públicos vigilados y horario diurno."
                testID="home-civic-disclaimer"
                title="Compromiso Comunitario y Cero Custodia"
              />
            </VStack>
          </ScrollView>

          {/* ── Filter Modal / Bottom Sheet ─────────────────────────── */}
          {isFilterOpen ? (
            <Box
              className="absolute inset-0 z-50 justify-end bg-black/50"
              testID="filter-modal-overlay"
            >
              <Pressable
                className="flex-1"
                onPress={() => setIsFilterOpen(false)}
              />
              <Box
                className="rounded-t-3xl border-t border-outline bg-surface p-5 shadow-lg"
                testID="filter-modal-content"
              >
                <VStack className="gap-4">
                  <Box className="flex-row items-center justify-between">
                    <Heading style={textStyle('headline-sm')}>
                      Filtrar Ofertas
                    </Heading>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsFilterOpen(false)}
                      testID="filter-modal-close"
                    >
                      <Text
                        className="text-muted-foreground font-bold"
                        style={textStyle('headline-sm')}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </Box>

                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    Selecciona un par canónico para filtrar las ofertas disponibles en Ciudad Ojeda.
                  </Text>

                  <VStack className="gap-2">
                    {FILTER_OPTIONS.map((option) => {
                      const active = selectedPair === option.id;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          className={
                            active
                              ? 'flex-row items-center justify-between rounded-xl bg-primary px-4 py-3 shadow-xs'
                              : 'flex-row items-center justify-between rounded-xl border border-outline bg-surface-muted px-4 py-3'
                          }
                          key={option.id}
                          onPress={() => {
                            setSelectedPair(option.id);
                            setIsFilterOpen(false);
                          }}
                          testID={`home-filter-${option.id}`}
                        >
                          <Text
                            className={
                              active
                                ? 'text-primary-foreground font-semibold'
                                : 'text-foreground'
                            }
                            style={textStyle('label-md')}
                          >
                            {option.label}
                          </Text>
                          {active ? (
                            <Text
                              className="text-primary-foreground font-bold"
                              style={textStyle('label-md')}
                            >
                              ✓
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </VStack>
                </VStack>
              </Box>
            </Box>
          ) : null}

          {/* ── Anchored Mobile Bottom Dock ─────────────────────────── */}
          <BottomDock activeTab="offers" />
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
