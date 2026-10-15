import NetInfo from '@react-native-community/netinfo';
import type { setupListeners } from '@reduxjs/toolkit/query';

type SetupListenersHandler = NonNullable<Parameters<typeof setupListeners>[1]>;

/**
 * React Native has no `window` online/offline events, so the default
 * `setupListeners` behaviour never fires on device. NetInfo supplies the real
 * connectivity state for `refetchOnReconnect`.
 */
export const connectivityHandler: SetupListenersHandler = (dispatch, actions) =>
  NetInfo.addEventListener((state) => {
    dispatch(state.isConnected ? actions.onOnline() : actions.onOffline());
  });
