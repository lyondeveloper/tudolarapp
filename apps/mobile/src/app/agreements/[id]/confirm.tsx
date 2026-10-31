import { useRouter } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CivicNoticeBanner } from '@/features/marketplace/components/civic-notice-banner';
import { CONVERSATION_PREVIEW } from '@/features/marketplace/domain/preview-data';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

/**
 * Stitch 3.2 — Confirmación Post-Intercambio (adapted per ADR-0013).
 *
 * Presents the completed exchange breakdown in tabular figures, the two-point
 * final civic verification checklist, and the incident escalation pathway, while
 * omitting the 5-star rating and reputation score widgets excluded by ADR-0013.
 */
export default function AgreementConfirmScreen() {
  const router = useRouter();
  const [incidentNoticeVisible, setIncidentNoticeVisible] = useState(false);

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <VStack className="w-full gap-4">
              <Box className="self-start rounded-md bg-secondary px-2.5 py-1">
                <Text
                  className="text-secondary-foreground"
                  style={textStyle('label-sm')}
                >
                  Pacto Cumplido • Ciudad Ojeda
                </Text>
              </Box>

              <Heading style={TITLE_STYLE} testID="agreement-confirm-heading">
                Intercambio en Sitio Exitoso
              </Heading>

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-3">
                  <Box className="flex-row justify-between">
                    <VStack className="gap-0.5">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('label-sm')}
                      >
                        Tú entregaste:
                      </Text>
                      <Text
                        className="text-foreground"
                        style={textStyle('code-num')}
                      >
                        {CONVERSATION_PREVIEW.giveSummary}
                      </Text>
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-sm')}
                      >
                        Efectivo verificado en sitio
                      </Text>
                    </VStack>

                    <VStack className="items-end gap-0.5">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('label-sm')}
                      >
                        {`Recibiste de ${CONVERSATION_PREVIEW.counterpartyName}:`}
                      </Text>
                      <Text
                        className="text-primary"
                        style={textStyle('code-num')}
                      >
                        {CONVERSATION_PREVIEW.receiveSummary}
                      </Text>
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-sm')}
                      >
                        {CONVERSATION_PREVIEW.receiveDetail}
                      </Text>
                    </VStack>
                  </Box>

                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    {`${CONVERSATION_PREVIEW.meetingVenue} • ${CONVERSATION_PREVIEW.meetingTimeSlot}`}
                  </Text>
                </VStack>
              </Box>

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-2">
                  <Text
                    className="text-foreground"
                    style={textStyle('headline-sm')}
                  >
                    Verificación Cívica Final
                  </Text>
                  <Text
                    className="text-foreground"
                    style={textStyle('body-sm')}
                  >
                    • Revisé la autenticidad y estado físico de los billetes en mano.
                  </Text>
                  <Text
                    className="text-foreground"
                    style={textStyle('body-sm')}
                  >
                    • Confirmé la recepción de los fondos directamente en mi app bancaria antes de cerrar el encuentro.
                  </Text>
                </VStack>
              </Box>

              <CivicNoticeBanner
                body="La plataforma no custodia dinero ni cobra comisiones de intermediación. El registro del encuentro en persona concluye con esta confirmación bilateral; cualquier irregularidad se canaliza mediante reporte cívico."
                testID="agreement-non-custody-notice"
                title="Aviso TUDOLAR • Sin Custodia"
              />

              <Pressable
                accessibilityRole="button"
                className="items-center rounded-md border border-outline bg-surface p-3"
                onPress={() => setIncidentNoticeVisible(true)}
                testID="agreement-start-incident"
              >
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Iniciar Reporte Cívico
                </Text>
              </Pressable>

              {incidentNoticeVisible ? (
                <CivicNoticeBanner
                  body="Reclamo cívico abierto en modo vista previa (moderación manual en T14 / ADR-0011)."
                  testID="agreement-incident-notice"
                  title="Módulo de Integridad Comunitaria"
                />
              ) : null}

              <Button
                className="bg-secondary"
                onPress={() => router.push('/home')}
                testID="agreement-back-to-home"
              >
                <ButtonText
                  className="text-secondary-foreground"
                  style={textStyle('label-lg')}
                >
                  Finalizar y Volver al Mercado
                </ButtonText>
              </Button>
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
