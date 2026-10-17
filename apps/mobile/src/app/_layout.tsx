import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { Uniwind } from 'uniwind';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import { useRestoreSession } from '@/features/session/use-restore-session';
import { store } from '@/store';
import { useAppSelector } from '@/store/hooks';

// Held until the typeface is loaded and the session status is known, so no
// screen is ever painted with a fallback face or the wrong state.
SplashScreen.preventAutoHideAsync();

/**
 * Session restore reads the Redux store, so it must run *inside* the
 * `Provider` below. Calling the hook in the layout itself would run it above
 * the provider, where no store context exists.
 *
 * The native splash is hidden here, once both the typeface and the session
 * status have resolved, because the shell renders nothing meaningful while the
 * session is still `restoring`. A font that fails to load still releases the
 * splash, so a missing asset cannot strand the app on it.
 */
function AppReady({ fontsReady }: { fontsReady: boolean }) {
  const status = useAppSelector((state) => state.session.status);
  useRestoreSession();

  useEffect(() => {
    if (fontsReady && status !== 'restoring') void SplashScreen.hideAsync();
  }, [fontsReady, status]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <GluestackUIProvider>
            <ThemeProvider
              value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
            >
              <AppReady fontsReady={fontsReady} />
              <Stack screenOptions={{ headerShown: false }} />
            </ThemeProvider>
          </GluestackUIProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
