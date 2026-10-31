import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { BottomDock } from '@/features/marketplace/components/bottom-dock';
import { CivicNoticeBanner } from '@/features/marketplace/components/civic-notice-banner';
import {
  CONVERSATION_PREVIEW,
  type ChatMessagePreview,
} from '@/features/marketplace/domain/preview-data';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { textStyle } from '@/theme/typography';

const TITLE_STYLE = textStyle('headline-lg-mobile') as ComponentProps<
  typeof Heading
>['style'];

interface MessageFormValues {
  body: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const agreementId = params.id ?? CONVERSATION_PREVIEW.id;

  const [selectedVenue, setSelectedVenue] = useState(
    CONVERSATION_PREVIEW.meetingVenue,
  );
  const [venuesModalOpen, setVenuesModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);
  const [messages, setMessages] = useState<readonly ChatMessagePreview[]>(
    CONVERSATION_PREVIEW.messages,
  );

  const { control, handleSubmit, reset } = useForm<MessageFormValues>({
    defaultValues: { body: '' },
  });

  const onSendMessage = handleSubmit(({ body }) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${prev.length + 1}`,
        sender: 'self',
        authorLabel: 'Tú (Vista Previa)',
        text: trimmed,
        timestamp: 'Ahora',
      },
    ]);
    reset();
  });

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }}>
          <BottomDock activeTab="agreements" />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <VStack className="w-full gap-4">
              <Box className="flex-row items-center justify-between">
                <VStack className="flex-1 gap-0.5">
                  <Heading style={TITLE_STYLE}>
                    {CONVERSATION_PREVIEW.counterpartyName}
                  </Heading>
                  <Text
                    className="text-muted-foreground"
                    style={textStyle('body-sm')}
                  >
                    {CONVERSATION_PREVIEW.counterpartyContext}
                  </Text>
                </VStack>

                <Pressable
                  accessibilityRole="button"
                  className="rounded-md border border-outline bg-surface-muted px-3 py-1.5"
                  onPress={() => setIncidentModalOpen((prev) => !prev)}
                  testID="chat-open-incident-modal"
                >
                  <Text
                    className="text-foreground"
                    style={textStyle('label-sm')}
                  >
                    Seguridad / Reportar
                  </Text>
                </Pressable>
              </Box>

              <CivicNoticeBanner
                body="TUDOLAR no custodia dinero ni media en el efectivo. El pacto se valida directamente entre ciudadanos en sitios públicos y en horario diurno."
                testID="chat-non-custody-banner"
                title="Plataforma Cívica Sin Custodia"
              />

              <Box className="rounded-md border border-border bg-surface p-4">
                <VStack className="gap-3">
                  <Box className="flex-row items-center justify-between">
                    <Text
                      className="text-foreground"
                      style={textStyle('headline-sm')}
                    >
                      Pacto de Encuentro
                    </Text>
                    <Text
                      className="text-primary"
                      style={textStyle('label-sm')}
                    >
                      {`Oferta ${CONVERSATION_PREVIEW.offerCode} • Por confirmar (1/2)`}
                    </Text>
                  </Box>

                  <Box className="flex-row justify-between rounded-md bg-surface-muted p-3">
                    <VStack className="gap-0.5">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('label-sm')}
                      >
                        Entregas (Tú):
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
                        {CONVERSATION_PREVIEW.giveDetail}
                      </Text>
                    </VStack>

                    <VStack className="items-end gap-0.5">
                      <Text
                        className="text-muted-foreground"
                        style={textStyle('label-sm')}
                      >
                        Recibes:
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

                  <VStack className="gap-1">
                    <Text
                      className="text-foreground"
                      style={textStyle('label-md')}
                    >
                      {selectedVenue}
                    </Text>
                    <Text
                      className="text-muted-foreground"
                      style={textStyle('body-sm')}
                    >
                      {CONVERSATION_PREVIEW.meetingTimeSlot}
                    </Text>
                    <Text
                      className="text-secondary"
                      style={textStyle('label-sm')}
                    >
                      {CONVERSATION_PREVIEW.counterpartySignedLabel}
                    </Text>
                  </VStack>

                  <Box className="flex-row gap-2">
                    <Button
                      className="flex-1 bg-secondary"
                      onPress={() =>
                        router.push(`/agreements/${agreementId}/confirm`)
                      }
                      testID="chat-accept-agreement"
                    >
                      <ButtonText
                        className="text-secondary-foreground"
                        style={textStyle('label-md')}
                      >
                        Aceptar Términos de Cita
                      </ButtonText>
                    </Button>

                    <Pressable
                      accessibilityRole="button"
                      className="justify-center rounded-md border border-outline bg-surface-muted px-3 py-2"
                      onPress={() => setVenuesModalOpen((prev) => !prev)}
                      testID="chat-propose-venue-button"
                    >
                      <Text
                        className="text-foreground"
                        style={textStyle('label-sm')}
                      >
                        Proponer otro punto
                      </Text>
                    </Pressable>
                  </Box>
                </VStack>
              </Box>

              {venuesModalOpen ? (
                <Box
                  className="rounded-lg border border-outline bg-surface p-3"
                  testID="chat-verified-venues-modal"
                >
                  <VStack className="gap-2">
                    <Text
                      className="text-foreground"
                      style={textStyle('label-lg')}
                    >
                      Puntos Verificados en Ciudad Ojeda
                    </Text>
                    {CONVERSATION_PREVIEW.verifiedAlternativeVenues.map(
                      (venue) => (
                        <Pressable
                          accessibilityRole="button"
                          className="rounded-md border border-border bg-surface-muted p-2.5"
                          key={venue.id}
                          onPress={() => {
                            setSelectedVenue(venue.name);
                            setVenuesModalOpen(false);
                          }}
                          testID={`chat-venue-option-${venue.id}`}
                        >
                          <Text
                            className="text-foreground"
                            style={textStyle('label-md')}
                          >
                            {venue.name}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </VStack>
                </Box>
              ) : null}

              {incidentModalOpen ? (
                <Box
                  className="rounded-lg border border-warning-border bg-warning p-3"
                  testID="chat-incident-modal"
                >
                  <VStack className="gap-2">
                    <Text
                      className="text-warning-foreground"
                      style={textStyle('label-lg')}
                    >
                      Reportar Incidencia
                    </Text>
                    <Text
                      className="text-warning-foreground"
                      style={textStyle('body-sm')}
                    >
                      ADR-0011: Un reporte de incidencia notifica a moderación sin liberar la reserva automáticamente hasta resolución o cancelación mutua.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      className="self-start rounded-md bg-primary px-3 py-1.5"
                      onPress={() => {
                        setIncidentSubmitted(true);
                        setIncidentModalOpen(false);
                      }}
                      testID="chat-submit-incident"
                    >
                      <Text
                        className="text-primary-foreground"
                        style={textStyle('label-sm')}
                      >
                        Enviar Reporte
                      </Text>
                    </Pressable>
                  </VStack>
                </Box>
              ) : null}

              {incidentSubmitted ? (
                <CivicNoticeBanner
                  body="Incidencia registrada en vista previa local."
                  testID="chat-incident-submitted-banner"
                  title="Reporte Cívico Enviado"
                />
              ) : null}

              <VStack className="gap-2">
                {messages.map((message) => (
                  <Box
                    className={
                      message.sender === 'self'
                        ? 'self-end rounded-md bg-primary p-3'
                        : 'self-start rounded-md border border-border bg-surface p-3'
                    }
                    key={message.id}
                  >
                    <Text
                      className={
                        message.sender === 'self'
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }
                      style={textStyle('body-sm')}
                    >
                      {message.text}
                    </Text>
                  </Box>
                ))}
              </VStack>

              <Box className="flex-row items-center gap-2">
                <Box className="flex-1">
                  <Controller
                    control={control}
                    name="body"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input>
                        <InputField
                          onBlur={onBlur}
                          onChangeText={onChange}
                          placeholder="Escribe un mensaje para coordinar..."
                          style={textStyle('body-md')}
                          testID="chat-message-input"
                          value={value}
                        />
                      </Input>
                    )}
                  />
                </Box>
                <Button onPress={onSendMessage} testID="chat-message-send">
                  <ButtonText style={textStyle('label-md')}>Enviar</ButtonText>
                </Button>
              </Box>
            </VStack>
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
