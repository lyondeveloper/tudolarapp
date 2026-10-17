import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { sessionRestoreStarted } from '@/features/session/session-slice';
import { store } from '@/store';

/**
 * One scenario per file; see app-shell.anonymous.spec.tsx for why.
 *
 * This renders the `/explore` route directly. While the Expo starter template
 * is still present it resolves to that template screen; once the template is
 * removed, expo-router has no such route and presents its unmatched screen.
 */
jest.mock('expo-secure-store', () => {
  const map = new Map<string, string>();
  return {
    __store: map,
    getItemAsync: async (key: string) => map.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      map.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      map.delete(key);
    },
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: () => () => undefined,
  fetch: async () => ({ isConnected: true }),
}));

const secureStore = jest.requireMock('expo-secure-store') as {
  __store: Map<string, string>;
};

const mockFetch = jest.fn();

beforeEach(() => {
  secureStore.__store.clear();
  store.dispatch(sessionRestoreStarted());
  mockFetch.mockReset();
  mockFetch.mockImplementation(async () => ({
    ok: false,
    status: 404,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ message: 'Not found' }),
    json: async () => ({ message: 'Not found' }),
  }));
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('starter template removal', () => {
  it('has no starter-template explore screen', async () => {
    renderRouter('src/app', { initialUrl: '/explore' });

    // Wait for the router to settle on something before asserting. The explicit
    // budget is needed because `renderRouter` turns on fake timers.
    await waitFor(
      () => {
        expect(screen.toJSON()).not.toBeNull();
      },
      { timeout: 10_000 },
    );

    expect(screen.queryByText('Expo documentation')).toBeNull();
    expect(screen.queryByText('Welcome to Expo')).toBeNull();
    expect(screen.queryByText('GET STARTED')).toBeNull();
  });
});
