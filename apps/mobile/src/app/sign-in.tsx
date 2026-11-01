import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { SignInForm } from '@/features/auth/sign-in-form';
import { RequireAnonymous } from '@/features/session/session-gate';

export default function SignInScreen() {
  return (
    <RequireAnonymous>
      <Box className="flex-1 bg-background">
        <SafeAreaView className="flex-1">
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SignInForm />
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAnonymous>
  );
}
