import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { SignInForm } from '@/features/auth/sign-in-form';

export default function SignInScreen() {
  return (
    <Box className="flex-1 bg-background">
      <SafeAreaView className="flex-1 justify-center px-6">
        <SignInForm />
      </SafeAreaView>
    </Box>
  );
}
