import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Provider } from 'react-redux';

import HomeScreen from '@/app/home';
import {
  sessionEstablished,
  sessionReducer,
} from '@/features/session/session-slice';
import { collectClassNames, collectFontFamilies } from '@/test-support/render-tree';
import { fontFamilies } from '@/theme/typography';

/**
 * The authenticated placeholder must render from the token layer and use the
 * approved typographic scale. See sign-in-tokens.spec.tsx for why the
 * assertions read the tree's props rather than resolved styles.
 */
jest.mock('@/services/api', () => ({
  useCurrentUserQuery: () => ({
    data: { displayName: 'Demo User', username: 'demo' },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));

const SCREEN_SOURCE = 'app/home.tsx';

/** A hex colour written literally, which no screen should contain. */
const LITERAL_COLOUR = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;

async function renderHomeScreen() {
  const store = configureStore({ reducer: { session: sessionReducer } });
  store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

  return render(
    <Provider store={store}>
      <HomeScreen />
    </Provider>,
  );
}

describe('authenticated placeholder tokens', () => {
  it('names the token roles rather than literal values', async () => {
    await renderHomeScreen();

    const classNames = collectClassNames().join(' ');
    expect(classNames).toContain('bg-background');
    expect(classNames).toContain('text-foreground');
  });

  it('applies the approved typographic scale', async () => {
    await renderHomeScreen();

    const families = collectFontFamilies();
    expect(families).toContain(fontFamilies.bold);
    expect(families).toContain(fontFamilies.regular);
  });

  it('carries no literal colour in its source', () => {
    const contents = readFileSync(join(__dirname, '..', SCREEN_SOURCE), 'utf8');
    expect(LITERAL_COLOUR.test(contents)).toBe(false);
  });
});
