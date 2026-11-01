import { useRouter } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { BottomDock } from '@/features/marketplace/components/bottom-dock';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { sessionCleared } from '@/features/session/session-slice';
import {
  useCurrentUserQuery,
  useLogoutMutation,
  useSellerEligibilityQuery,
} from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionStatus = useAppSelector((state) => state.session.status);
  const activeMarketId = useAppSelector((state) => state.market.activeMarketId);
  const isAuthenticated = sessionStatus === 'authenticated';

  const { data: user, isLoading: userLoading } = useCurrentUserQuery(
    undefined,
    { skip: !isAuthenticated },
  );

  const { data: eligibility } = useSellerEligibilityQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [nodeModalVisible, setNodeModalVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Clear session even if network call fails
    } finally {
      dispatch(sessionCleared());
      router.replace('/home');
    }
  };

  const isSellerEligible = eligibility?.state === 'eligible';

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
            {/* ── Top Header: Brand & Scope ─────────────────────────── */}
            <Box className="flex-row items-center justify-between">
              <VStack className="gap-0.5">
                <Heading style={TITLE_STYLE}>Mi Perfil</Heading>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  Cuenta Global TUDOLAR • Red P2P
                </Text>
              </VStack>
              <Box className="rounded-full border border-outline-variant bg-surface px-3 py-1 shadow-xs">
                <Text
                  className="text-secondary font-semibold"
                  style={textStyle('label-sm')}
                >
                  Identidad Global
                </Text>
              </Box>
            </Box>

            {/* ── User Overview Card ──────────────────────────────── */}
            <Box className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
                  {userLoading ? (
                    <Spinner />
                  ) : user ? (
                    <VStack className="gap-3">
                      <Box className="flex-row items-center gap-3">
                        <Box className="h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-xs">
                          <Text
                            className="text-primary-foreground font-bold"
                            style={textStyle('headline-md')}
                          >
                            {user.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </Box>
                        <VStack className="flex-1 gap-0.5">
                          <Text
                            className="text-foreground font-bold"
                            style={textStyle('headline-sm')}
                          >
                            {user.displayName}
                          </Text>
                          {user.username ? (
                            <Text
                              className="text-primary font-medium"
                              style={textStyle('body-md')}
                            >
                              @{user.username}
                            </Text>
                          ) : null}
                        </VStack>
                      </Box>

                      {/* Verification Status Pills */}
                      <Box className="flex-row flex-wrap gap-2 border-t border-outline-variant pt-3">
                        <Box className="flex-row items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1">
                          <Text
                            className="text-secondary"
                            style={textStyle('label-sm')}
                          >
                            ✓ Email Verificado
                          </Text>
                        </Box>
                        {user.phoneVerified ? (
                          <Box className="flex-row items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1">
                            <Text
                              className="text-secondary"
                              style={textStyle('label-sm')}
                            >
                              ✓ Teléfono Protegido
                            </Text>
                          </Box>
                        ) : null}
                      </Box>
                    </VStack>
                  ) : null}
                </Box>

                {/* ── Contact Details ───────────────────────────────── */}
                <Box className="rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm">
                  <VStack className="gap-3">
                    <Text
                      className="text-foreground font-semibold"
                      style={textStyle('label-md')}
                    >
                      Datos de Contacto y Seguridad
                    </Text>

                    <Box className="flex-row items-center justify-between border-b border-outline-variant pb-2">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-md')}
                      >
                        Correo
                      </Text>
                      <Text
                        className="text-foreground font-medium"
                        style={textStyle('body-md')}
                      >
                        {user?.email ?? 'No configurado'}
                      </Text>
                    </Box>

                    <Box className="flex-row items-center justify-between border-b border-outline-variant pb-2">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-md')}
                      >
                        Teléfono
                      </Text>
                      <Text
                        className="text-foreground font-medium"
                        style={textStyle('body-md')}
                      >
                        {user?.phoneNumber ?? 'No verificado'}
                      </Text>
                    </Box>

                    <Box className="flex-row items-center justify-between">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-md')}
                      >
                        Estado de Vendedor
                      </Text>
                      <Box
                        className={
                          isSellerEligible
                            ? 'rounded-full bg-secondary/10 px-2.5 py-0.5'
                            : 'rounded-full bg-surface-muted px-2.5 py-0.5'
                        }
                      >
                        <Text
                          className={
                            isSellerEligible
                              ? 'text-secondary font-semibold'
                              : 'text-muted-foreground'
                          }
                          style={textStyle('label-sm')}
                        >
                          {isSellerEligible
                            ? '✓ Vendedor Habilitado'
                            : 'Sin Habilitación'}
                        </Text>
                      </Box>
                    </Box>
                  </VStack>
                </Box>

            {/* ── Active Market Node Switcher ────────────────────────── */}
            <Box className="rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm">
              <VStack className="gap-2">
                <Box className="flex-row items-center justify-between">
                  <Text
                    className="text-foreground font-semibold"
                    style={textStyle('label-md')}
                  >
                    Mercado Activo (Nodo Geográfico)
                  </Text>
                  <Box className="rounded-full bg-secondary/10 px-2 py-0.5">
                    <Text
                      className="text-secondary"
                      style={textStyle('label-sm')}
                    >
                      ● Activo
                    </Text>
                  </Box>
                </Box>
                <Text
                  className="text-primary font-bold"
                  style={textStyle('body-lg')}
                >
                  {activeMarketId === 'ciudad-ojeda'
                    ? 'Ciudad Ojeda • Polígono Lagunillas'
                    : 'Ciudad Ojeda'}
                </Text>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  Las ofertas y búsquedas se limitan a este municipio. Tu cuenta no está atada a un nodo y puedes cambiar libremente de mercado.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  className="mt-1 min-h-[42px] items-center justify-center rounded-xl border border-outline bg-surface-muted active:bg-accent"
                  onPress={() => setNodeModalVisible(!nodeModalVisible)}
                  testID="profile-switch-node-button"
                >
                  <Text
                    className="text-primary font-semibold"
                    style={textStyle('label-md')}
                  >
                    Cambiar Nodo de Mercado
                  </Text>
                </Pressable>

                {nodeModalVisible ? (
                  <Box className="mt-2 rounded-xl border border-warning-border bg-warning p-3">
                    <Text
                      className="text-warning-foreground"
                      style={textStyle('body-sm')}
                    >
                      Actualmente Ciudad Ojeda es el único nodo habilitado para la fase piloto inicial. Próximos nodos: Cabimas y Maracaibo.
                    </Text>
                  </Box>
                ) : null}
              </VStack>
            </Box>

            {/* ── Logout Action ─────────────────────────────────────── */}
            <Button
              className="min-h-[48px] rounded-xl border border-destructive bg-surface"
              isDisabled={isLoggingOut}
              onPress={handleLogout}
              testID="profile-logout-button"
              variant="outline"
            >
              <ButtonText
                className="text-destructive font-semibold"
                style={textStyle('label-md')}
              >
                Cerrar Sesión
              </ButtonText>
            </Button>
          </VStack>
        </ScrollView>

        {/* ── Bottom Dock (Tab 5: Perfil) ─────────────────────────── */}
        <BottomDock activeTab="profile" />
      </SafeAreaView>
    </Box>
  </RequireAuthenticated>
  );
}
