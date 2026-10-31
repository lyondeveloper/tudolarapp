import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  formatTabularAmount,
  type PreviewOffer,
} from '@/features/marketplace/domain/catalog';
import { textStyle } from '@/theme/typography';

export interface OfferCardProps {
  offer: PreviewOffer;
  onSelect: (offerId: string) => void;
}

export function OfferCard({ offer, onSelect }: OfferCardProps) {
  const limitsLabel = `${formatTabularAmount(offer.minAmount)} – ${formatTabularAmount(
    offer.maxAmount,
  )} ${offer.amountAsset}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelect(offer.id)}
      testID={`offer-card-${offer.id}`}
    >
      <Box className="w-full rounded-md border border-border bg-surface p-4">
        <VStack className="gap-3">
          <Box className="flex-row items-center justify-between gap-2">
            <VStack className="flex-1 gap-0.5">
              <Text className="text-foreground" style={textStyle('headline-sm')}>
                {offer.sellerDisplayName}
              </Text>
              <Text
                className="text-muted-foreground"
                style={textStyle('body-sm')}
              >
                {offer.sellerVerificationBadge}
              </Text>
            </VStack>

            <Box className="items-end">
              <Text
                className="text-muted-foreground"
                style={textStyle('label-sm')}
              >
                Tasa ofrecida
              </Text>
              <Text className="text-primary" style={textStyle('code-num')}>
                {offer.rateUnitLabel}
              </Text>
            </Box>
          </Box>

          <Box className="rounded-md bg-surface-muted p-2.5">
            <VStack className="gap-1">
              <Text className="text-foreground" style={textStyle('label-md')}>
                {offer.operationHeadline}
              </Text>
              <Box className="flex-row items-center justify-between">
                <Text
                  className="text-muted-foreground"
                  style={textStyle('body-sm')}
                >
                  Rango admitido:
                </Text>
                <Text className="text-foreground" style={textStyle('code-num')}>
                  {limitsLabel}
                </Text>
              </Box>
            </VStack>
          </Box>

          <Box className="flex-row flex-wrap gap-1.5">
            {offer.railLabels.map((rail) => (
              <Box
                key={rail}
                className="rounded-sm border border-outline-variant bg-surface-muted px-2 py-0.5"
              >
                <Text
                  className="text-foreground"
                  style={textStyle('label-sm')}
                >
                  {rail}
                </Text>
              </Box>
            ))}
          </Box>

          <Box className="flex-row items-center justify-between">
            <Text className="text-foreground" style={textStyle('body-sm')}>
              {offer.corridorLabel}
            </Text>
            <Text
              className="text-muted-foreground"
              style={textStyle('label-sm')}
            >
              {offer.distanceLabel}
            </Text>
          </Box>

          <Button
            onPress={() => onSelect(offer.id)}
            testID={`offer-card-cta-${offer.id}`}
          >
            <ButtonText style={textStyle('label-lg')}>
              {offer.ctaLabel}
            </ButtonText>
          </Button>
        </VStack>
      </Box>
    </Pressable>
  );
}
