import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { textStyle } from '@/theme/typography';

export interface CivicNoticeBannerProps {
  title: string;
  body: string;
  testID?: string;
}

export function CivicNoticeBanner({
  title,
  body,
  testID,
}: CivicNoticeBannerProps) {
  return (
    <Box
      className="w-full rounded-md border border-warning-border bg-warning p-3"
      testID={testID}
    >
      <VStack className="gap-1">
        <Text
          className="text-warning-foreground"
          style={textStyle('label-md')}
        >
          {title}
        </Text>
        <Text
          className="text-warning-foreground"
          style={textStyle('body-sm')}
        >
          {body}
        </Text>
      </VStack>
    </Box>
  );
}
