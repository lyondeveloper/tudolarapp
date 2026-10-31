import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { RegisterForm } from '@/features/auth/register-form';
import { RequireAnonymous } from '@/features/session/session-gate';

export default function RegisterScreen() {
  return (
    <RequireAnonymous>
      <Box className="flex-1 bg-background">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <RegisterForm />
          </ScrollView>
        </SafeAreaView>
      </Box>
    </RequireAnonymous>
  );
}
