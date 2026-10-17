import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { RequireAuthenticated } from '@/features/session/session-gate';
import { useCurrentUserQuery } from '@/services/api';

/**
 * Temporary authenticated screen.
 *
 * It exists so a successful sign-in has a destination, and it reads the signed
 * in user through the same RTK Query endpoint the rest of the app uses. It
 * renders only the fields it maps, never the raw payload. T15/T17 replace it
 * with the real home once the Stitch design and the marketplace screens land.
 */
export default function HomeScreen() {
  const { data: user, isLoading, isError } = useCurrentUserQuery();

  const identity = user?.username ?? user?.email ?? null;

  return (
    <RequireAuthenticated>
      <Box className="flex-1 bg-background">
        <SafeAreaView className="flex-1 justify-center px-6">
          <VStack className="w-full gap-4">
            <Heading size="xl">Signed in</Heading>

            {isLoading ? <Spinner /> : null}

            {isError ? (
              <Text className="text-destructive">
                Could not load your profile.
              </Text>
            ) : null}

            {user ? (
              <>
                <Text>{user.displayName}</Text>
                {identity ? <Text>{identity}</Text> : null}
              </>
            ) : null}
          </VStack>
        </SafeAreaView>
      </Box>
    </RequireAuthenticated>
  );
}
