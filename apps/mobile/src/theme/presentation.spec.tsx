import { render } from '@testing-library/react-native';
import { renderRouter, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { sessionRestoreStarted } from '@/features/session/session-slice';
import { store } from '@/store';

/**
 * The presentation is owned by `GluestackUIProvider`, which drives
 * `Uniwind.setTheme`. The design mandates light mode, so light must be the
 * default, and the dark seam must stay selectable.
 *
 * The shell case renders the real router once (the library supports one
 * `renderRouter` per file) and is placed last, because `renderRouter` turns on
 * fake timers without restoring them.
 */
jest.mock('uniwind', () => {
  const setTheme = jest.fn();
  return {
    __setTheme: setTheme,
    Uniwind: { setTheme, updateInsets: jest.fn() },
    // The gluestack components wrap themselves with this; a pass-through keeps
    // them renderable without pulling in the real CSS pipeline.
    withUniwind: (component: unknown) => component,
  };
});

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

const { __setTheme: setTheme } = jest.requireMock('uniwind') as {
  __setTheme: jest.Mock;
};

beforeEach(() => {
  setTheme.mockReset();
  store.dispatch(sessionRestoreStarted());
  globalThis.fetch = jest.fn(async () => ({
    ok: false,
    status: 404,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ message: 'Not found' }),
    json: async () => ({ message: 'Not found' }),
  })) as unknown as typeof fetch;
});

describe('presentation', () => {
  it('defaults to the light presentation', async () => {
    await render(
      <GluestackUIProvider>
        <Text>content</Text>
      </GluestackUIProvider>,
    );

    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('still allows the dark presentation to be selected', async () => {
    await render(
      <GluestackUIProvider mode="dark">
        <Text>content</Text>
      </GluestackUIProvider>,
    );

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('does not force dark when the shell mounts', async () => {
    renderRouter('src/app', { initialUrl: '/' });

    await waitFor(() => {
      expect(setTheme).toHaveBeenCalledWith('light');
    });
    expect(setTheme).not.toHaveBeenCalledWith('dark');
  });
});
