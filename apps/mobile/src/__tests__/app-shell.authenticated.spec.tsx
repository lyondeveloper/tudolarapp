import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { sessionRestoreStarted } from '@/features/session/session-slice';
import { store } from '@/store';

/**
 * One scenario per file; see app-shell.anonymous.spec.tsx for why.
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

const REFRESH_TOKEN_KEY = 'tudolar.session.refreshToken';

function jsonResponse(body: unknown, status = 200) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
  // RTK Query clones the response before reading its body, so the mock has to
  // support `clone()` or every request rejects.
  return { ...response, clone: () => jsonResponse(body, status) };
}

/** RTK Query hands `fetch` a `Request` object, not a URL string. */
function requestUrl(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'url' in input) {
    return String((input as { url: unknown }).url);
  }
  return String(input);
}

const mockFetch = jest.fn();

beforeEach(() => {
  secureStore.__store.clear();
  store.dispatch(sessionRestoreStarted());
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (input: unknown) => {
    const url = requestUrl(input);
    if (url.includes('/auth/sessions/refresh')) {
      return jsonResponse({
        accessToken: 'restored-access-token',
        accessTokenExpiresIn: 600,
        refreshToken: 'rotated-refresh-token',
        refreshTokenExpiresIn: 2592000,
      });
    }
    if (url.includes('/users/me')) {
      return jsonResponse({
        id: 'user-id',
        displayName: 'Demo User',
        username: 'demo',
        email: 'demo@tudolar.local',
        emailVerified: true,
        phoneNumber: null,
        phoneVerified: false,
        accountStatus: 'active',
        authMethods: ['password'],
        // Deliberately present in the payload so the assertion below proves the
        // screen renders only the fields it maps, not whatever the API returns.
        passwordHash: '$argon2id$leaked-hash-marker',
      });
    }
    return jsonResponse({ message: 'Not found' }, 404);
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('app shell for a restored session', () => {
  it('presents the authenticated screen instead of sign-in, and no secrets', async () => {
    secureStore.__store.set(REFRESH_TOKEN_KEY, 'stored-refresh-token');
    const router = renderRouter('src/app', { initialUrl: '/' });

    await waitFor(() => {
      expect(router.getPathname()).toBe('/home');
    });
    await waitFor(() => {
      expect(screen.getByText('Demo User')).toBeTruthy();
    });

    // The sign-in screen is not presented.
    expect(screen.queryByText('Username or email')).toBeNull();

    // No credentials, tokens, or password data are rendered.
    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toContain('restored-access-token');
    expect(rendered).not.toContain('rotated-refresh-token');
    expect(rendered).not.toContain('stored-refresh-token');
    expect(rendered).not.toContain('leaked-hash-marker');
    expect(screen.queryByText(/password/i)).toBeNull();
  });
});
