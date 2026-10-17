import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { sessionReducer } from './session-slice';
import { useRestoreSession } from './use-restore-session';

/**
 * Only the two external boundaries are mocked: device storage and the network
 * call. The hook's own logic, the session reducer, and the store are real, so
 * the assertions exercise the behavior under test.
 */
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
  };
});

jest.mock('@/services/api', () => {
  const refreshSession = jest.fn();
  return {
    __refreshSession: refreshSession,
    useRefreshSessionMutation: () => [refreshSession],
  };
});

const secureStore = jest.requireMock('expo-secure-store') as {
  __store: Map<string, string>;
};
const { __refreshSession: refreshSession } = jest.requireMock(
  '@/services/api',
) as { __refreshSession: jest.Mock };

const REFRESH_TOKEN_KEY = 'tudolar.session.refreshToken';

function renderRestore() {
  const store = configureStore({ reducer: { session: sessionReducer } });
  const view = renderHook(() => useRestoreSession(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
  return { store, ...view };
}

beforeEach(() => {
  secureStore.__store.clear();
  refreshSession.mockReset();
});

describe('useRestoreSession', () => {
  it('becomes anonymous when no refresh token is stored', async () => {
    const { store } = renderRestore();

    await waitFor(() => {
      expect(store.getState().session.status).toBe('anonymous');
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('becomes authenticated and stores the rotated token when the API accepts the stored token', async () => {
    secureStore.__store.set(REFRESH_TOKEN_KEY, 'stored-refresh-token');
    refreshSession.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'rotated-refresh-token',
        }),
    });

    const { store } = renderRestore();

    await waitFor(() => {
      expect(store.getState().session.status).toBe('authenticated');
    });
    expect(store.getState().session.accessToken).toBe('new-access-token');
    expect(secureStore.__store.get(REFRESH_TOKEN_KEY)).toBe(
      'rotated-refresh-token',
    );
    expect(refreshSession).toHaveBeenCalledWith({
      refreshToken: 'stored-refresh-token',
    });
  });

  it('discards the stored token and becomes anonymous when the API rejects it', async () => {
    secureStore.__store.set(REFRESH_TOKEN_KEY, 'rejected-refresh-token');
    refreshSession.mockReturnValue({
      unwrap: () => Promise.reject(new Error('refresh rejected')),
    });

    const { store } = renderRestore();

    await waitFor(() => {
      expect(store.getState().session.status).toBe('anonymous');
    });
    expect(secureStore.__store.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(store.getState().session.accessToken).toBeNull();
  });
});
