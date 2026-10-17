import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { sessionRestoreStarted } from '@/features/session/session-slice';
import { store } from '@/store';

/**
 * One scenario per file.
 *
 * `expo-router/testing-library`'s `renderRouter` calls `jest.useFakeTimers()`
 * and reads its route from a module-level router store that it never resets
 * between tests, so a second `renderRouter` in the same file renders against
 * the previous test's route. Each file therefore renders the router exactly
 * once and asserts everything about that one scenario.
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

describe('app shell for an anonymous session', () => {
  it('presents sign-in first and no starter-template screen', async () => {
    const router = renderRouter('src/app', { initialUrl: '/' });

    // `renderRouter` turns on fake timers, so `waitFor` advances time in 50ms
    // steps; the explicit budget keeps this deterministic under load.
    await waitFor(
      () => {
        expect(store.getState().session.status).toBe('anonymous');
        expect(router.getPathname()).toBe('/sign-in');
      },
      { timeout: 10_000 },
    );

    // The sign-in screen is the one presented.
    expect(screen.getByText('Username or email')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();

    // No Expo starter-template screen, tab bar, or branding is presented.
    expect(screen.queryByText('Welcome to Expo')).toBeNull();
    expect(screen.queryByText('GET STARTED')).toBeNull();
    expect(screen.queryByText('Explore')).toBeNull();
    expect(screen.queryByText('Home')).toBeNull();
  });
});
