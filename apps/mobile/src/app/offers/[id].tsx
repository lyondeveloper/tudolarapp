import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { SafetyHandshakeModal } from '@/features/marketplace/components/safety-handshake-modal';
import {
  calculateReceiveRange,
  formatTabularAmount,
} from '@/features/marketplace/domain/catalog';
import { findOfferById } from '@/features/marketplace/domain/preview-data';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

export default function OfferDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const offer = findOfferById(params.id);
  const [handshakeModalOpen, setHandshakeModalOpen] = useState(false);
  const [reportNoticeVisible, setReportNoticeVisible] = useState(false);

  const receiveRange = calculateReceiveRange({
    pairId: offer.pairId,
    minGiveAmount: offer.minAmount,
    maxGiveAmount: offer.maxAmount,
    rate: offer.rate,
    marginPercent: offer.marginPercent,
  });

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
              <Box className="flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/home')}
                  testID="offer-detail-back"
                >
                  <Text className="text-primary" style={textStyle('label-md')}>
                    Volver a Ofertas
                  </Text>
                </Pressable>
                <Text
                  className="text-muted-foreground"
                  style={textStyle('label-sm')}
                >
                  {`Nodo Ciudad Ojeda Activo • #${offer.code}`}
                </Text>
              </Box>

              <Heading style={TITLE_STYLE}>Detalle De Oferta</Heading>

              <CivicNoticeBanner
                body="TUDOLAR no custodia dinero ni cobra comisiones. El acuerdo y la entrega se realizan directamente entre las partes en puntos públicos vigilados."
                testID="offer-detail-civic-warning"
                title="Aviso Oficial Comunitario"
              />

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-3">
                  <Box className="flex-row items-center justify-between">
                    <Text
                      className="text-secondary"
                      style={textStyle('label-md')}
                    >
                      Oferta Activa (Vista Previa)
                    </Text>
                    <Text
                      className="text-muted-foreground"
                      style={textStyle('label-sm')}
                    >
                      {offer.updatedAgoLabel}
                    </Text>
                  </Box>

                  <Text
                    className="text-foreground"
                    style={textStyle('headline-md')}
                  >
                    {offer.operationHeadline}
                  </Text>

                  <Box className="rounded-md bg-surface-muted p-3">
                    <Box className="flex-row items-center justify-between">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('label-md')}
                      >
                        Tasa de Intercambio
                      </Text>
                      <Text
                        className="text-primary"
                        style={textStyle('code-num')}
                      >
                        {offer.rateUnitLabel}
                      </Text>
                    </Box>
                    <Box className="mt-2 flex-row items-center justify-between">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-sm')}
                      >
                        Rango Autorizado:
                      </Text>
                      <Text
                        className="text-foreground"
                        style={textStyle('code-num')}
                      >
                        {`${formatTabularAmount(offer.minAmount)} – ${formatTabularAmount(
                          offer.maxAmount,
                        )} ${offer.amountAsset}`}
                      </Text>
                    </Box>
                    <Box className="mt-1 flex-row items-center justify-between">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('body-sm')}
                      >
                        Equivalente estimado:
                      </Text>
                      <Text
                        className="text-foreground"
                        style={textStyle('code-num')}
                      >
                        {`${receiveRange.minReceiveFormatted} – ${receiveRange.maxReceiveFormatted} ${receiveRange.receiveAsset}`}
                      </Text>
                    </Box>
                  </Box>

                  <VStack className="gap-1">
                    <Text
                      className="text-foreground"
                      style={textStyle('label-lg')}
                    >
                      {`Condiciones de ${offer.sellerDisplayName}`}
                    </Text>
                    <Text
                      className="text-muted-foreground"
                      style={textStyle('body-md')}
                    >
                      {offer.conditionsSummary}
                    </Text>
                  </VStack>
                </VStack>
              </Box>

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-2">
                  <Text
                    className="text-foreground"
                    style={textStyle('headline-sm')}
                  >
                    Perfil del Oferente
                  </Text>
                  <Text
                    className="text-foreground"
                    style={textStyle('body-lg')}
                  >
                    {offer.sellerDisplayName}
                  </Text>
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    {offer.sellerMemberSince}
                  </Text>
                  <Text
                    className="text-foreground"
                    style={textStyle('label-sm')}
                  >
                    {`Teléfono Validado (Protegido): ${offer.sellerProtectedPhone}`}
                  </Text>
                </VStack>
              </Box>

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-2">
                  <Text
                    className="text-foreground"
                    style={textStyle('headline-sm')}
                  >
                    Corredor Seguro de Encuentro
                  </Text>
                  <Text
                    className="text-primary"
                    style={textStyle('label-lg')}
                  >
                    {offer.corridorLabel}
                  </Text>
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    Franja Horaria Autorizada: Lunes a Sábado, 9:00 AM – 4:00 PM (Exclusivamente en horario comercial diurno).
                  </Text>
                </VStack>
              </Box>

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-2">
                  <Text
                    className="text-foreground"
                    style={textStyle('headline-sm')}
                  >
                    Protocolo de Cautela Cívica
                  </Text>
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    • Verifica la autenticidad física: Revisa marca de agua y cinta de seguridad antes de liberar el pago digital.
                  </Text>
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    • Cero desvíos: No aceptes traslados a vehículos privados, callejones o domicilios particulares.
                  </Text>
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    • Contacto de confianza: Avisa a un allegado antes de asistir al punto público acordado.
                  </Text>
                </VStack>
              </Box>

              <SafetyHandshakeModal
                corridorLabel={offer.corridorLabel}
                onClose={() => setHandshakeModalOpen(false)}
                onConfirm={() => {
                  setHandshakeModalOpen(false);
                  router.push(`/chat/${offer.id}`);
                }}
                sellerName={offer.sellerDisplayName}
                visible={handshakeModalOpen}
              />

              <Button
                onPress={() => setHandshakeModalOpen(true)}
                testID="offer-detail-start-chat"
              >
                <ButtonText style={textStyle('label-lg')}>
                  Iniciar Chat y Coordinar Encuentro
                </ButtonText>
              </Button>

              <Pressable
                accessibilityRole="button"
                className="items-center rounded-md border border-outline bg-surface p-3"
                onPress={() => setReportNoticeVisible(true)}
                testID="offer-detail-report"
              >
                <Text
                  className="text-foreground"
                  style={textStyle('label-md')}
                >
                  Reportar Irregularidad o Perfil Sospechoso
                </Text>
              </Pressable>

              {reportNoticeVisible ? (
                <CivicNoticeBanner
                  body="Reporte cívico registrado en vista previa (moderación manual con SLA de revisión en T14 / ADR-0013)."
                  testID="offer-detail-report-notice"
                  title="Reporte de Moderación en Vista Previa"
                />
              ) : null}
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
