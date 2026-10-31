import { useState } from 'react';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { textStyle } from '@/theme/typography';

export interface SafetyHandshakeModalProps {
  visible: boolean;
  sellerName: string;
  corridorLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function SafetyHandshakeModal({
  visible,
  sellerName,
  corridorLabel,
  onConfirm,
  onClose,
}: SafetyHandshakeModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!visible) return null;

  return (
    <Box
      className="w-full rounded-xl border border-outline bg-surface p-4"
      testID="safety-handshake-modal"
    >
      <VStack className="gap-3">
        <Box className="flex-row items-center justify-between">
          <Text className="text-foreground" style={textStyle('headline-md')}>
            Compromiso Cívico
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            testID="safety-handshake-close"
          >
            <Text
              className="text-muted-foreground"
              style={textStyle('label-md')}
            >
              Cerrar
            </Text>
          </Pressable>
        </Box>

        <Text className="text-muted-foreground" style={textStyle('body-sm')}>
          {`Confirma las 3 pautas de seguridad mutua antes de abrir el canal privado con ${sellerName}:`}
        </Text>

        <VStack className="gap-2 rounded-md bg-surface-muted p-3">
          <Text className="text-foreground" style={textStyle('body-sm')}>
            {`1. Punto de encuentro público y visible (${corridorLabel}) en horario comercial diurno.`}
          </Text>
          <Text className="text-foreground" style={textStyle('body-sm')}>
            2. Verificación de billetes o acreditación bancaria en el sitio antes de retirarse.
          </Text>
          <Text className="text-foreground" style={textStyle('body-sm')}>
            3. Reconozco que TUDOLAR es una cartelera cívica sin custodia y no procesa ni retiene fondos.
          </Text>
        </VStack>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          className="flex-row items-center gap-2 rounded-md border border-outline bg-surface p-3"
          onPress={() => setAcknowledged((prev) => !prev)}
          testID="safety-handshake-checkbox"
        >
          <Box
            className={
              acknowledged
                ? 'h-5 w-5 rounded-sm bg-secondary'
                : 'h-5 w-5 rounded-sm border border-outline bg-surface-muted'
            }
          />
          <Text className="flex-1 text-foreground" style={textStyle('label-md')}>
            Acepto las 3 reglas de seguridad presencial y no custodia
          </Text>
        </Pressable>

        <Button
          className="bg-secondary"
          isDisabled={!acknowledged}
          onPress={() => {
            if (acknowledged) onConfirm();
          }}
          testID="safety-handshake-confirm"
        >
          <ButtonText
            className="text-secondary-foreground"
            style={textStyle('label-lg')}
          >
            Aceptar y Abrir Chat Privado
          </ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
