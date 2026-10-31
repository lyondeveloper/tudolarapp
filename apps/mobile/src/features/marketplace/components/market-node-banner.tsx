import { useState } from 'react';

import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MARKET_NODE_PREVIEW } from '@/features/marketplace/domain/preview-data';
import { textStyle } from '@/theme/typography';

export function MarketNodeBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box className="w-full rounded-lg border border-border bg-surface p-3">
      <VStack className="gap-2">
        <Box className="flex-row items-center justify-between gap-2">
          <VStack className="flex-1 gap-0.5">
            <Text className="text-foreground" style={textStyle('label-lg')}>
              {`Mercado Activo: ${MARKET_NODE_PREVIEW.marketName}`}
            </Text>
            <Text
              className="text-muted-foreground"
              style={textStyle('body-sm')}
            >
              {MARKET_NODE_PREVIEW.municipalityLabel}
            </Text>
          </VStack>

          <Pressable
            accessibilityRole="button"
            className="rounded-md border border-outline bg-surface-muted px-3 py-1.5"
            onPress={() => setExpanded((prev) => !prev)}
            testID="market-node-toggle"
          >
            <Text className="text-primary" style={textStyle('label-sm')}>
              Cambiar nodo
            </Text>
          </Pressable>
        </Box>

        {expanded ? (
          <Box className="rounded-md bg-surface-muted p-2.5">
            <VStack className="gap-1">
              <Text className="text-foreground" style={textStyle('body-sm')}>
                {MARKET_NODE_PREVIEW.geofenceNotice}
              </Text>
              <Text
                className="text-muted-foreground"
                style={textStyle('label-sm')}
              >
                {MARKET_NODE_PREVIEW.upcomingPhasesLabel}
              </Text>
            </VStack>
          </Box>
        ) : null}
      </VStack>
    </Box>
  );
}
