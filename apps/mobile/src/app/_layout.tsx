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

// Held until the session status is known, so the app never flashes the wrong
// screen while the stored refresh token is being exchanged.
SplashScreen.preventAutoHideAsync();

/**
 * Session restore reads the Redux store, so it must run *inside* the
 * `Provider` below. Calling the hook in the layout itself would run it above
 * the provider, where no store context exists.
 *
 * The native splash is hidden here, once the session status has resolved,
 * because the shell renders nothing meaningful while it is still `restoring`.
 */
function SessionRestore() {
  const status = useAppSelector((state) => state.session.status);
  useRestoreSession();

  useEffect(() => {
    if (status !== 'restoring') void SplashScreen.hideAsync();
  }, [status]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <GluestackUIProvider mode="dark">
            <ThemeProvider
              value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
            >
              <SessionRestore />
              <Stack screenOptions={{ headerShown: false }} />
            </ThemeProvider>
          </GluestackUIProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
