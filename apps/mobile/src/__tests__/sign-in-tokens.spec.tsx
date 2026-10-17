import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Provider } from 'react-redux';

import SignInScreen from '@/app/sign-in';
import {
  sessionCleared,
  sessionReducer,
} from '@/features/session/session-slice';
import { collectClassNames, collectFontFamilies } from '@/test-support/render-tree';
import { fontFamilies } from '@/theme/typography';

/**
 * The sign-in screen must render from the token layer rather than from literal
 * values, and must use the approved typographic scale.
 *
 * Jest stubs stylesheets, so a class name does not resolve to a style here. The
 * assertions therefore read what the screen actually passes down — the roles it
 * names as class names, and the families it applies as style — plus the screen
 * sources themselves for stray literal colours.
 */
jest.mock('@/services/api', () => ({
  useSignInWithPasswordMutation: () => [jest.fn()],
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));

const SCREEN_SOURCES = [
  'app/sign-in.tsx',
  'features/auth/sign-in-form.tsx',
] as const;

/** A hex colour written literally, which no screen should contain. */
const LITERAL_COLOUR = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;

async function renderSignInScreen() {
  const store = configureStore({ reducer: { session: sessionReducer } });
  store.dispatch(sessionCleared());

  return render(
    <Provider store={store}>
      <SignInScreen />
    </Provider>,
  );
}

describe('sign-in screen tokens', () => {
  it('names the token roles rather than literal values', async () => {
    await renderSignInScreen();

    const classNames = collectClassNames().join(' ');
    expect(classNames).toContain('bg-background');
    expect(classNames).toContain('text-foreground');
    expect(classNames).toContain('bg-primary');
    expect(classNames).toContain('text-primary-foreground');
  });

  it('applies the approved typographic scale', async () => {
    await renderSignInScreen();

    expect(collectFontFamilies()).toContain(fontFamilies.bold);
  });

  it('carries no literal colour in its sources', () => {
    for (const source of SCREEN_SOURCES) {
      const contents = readFileSync(join(__dirname, '..', source), 'utf8');
      expect({ source, literal: LITERAL_COLOUR.test(contents) }).toEqual({
        source,
        literal: false,
      });
    }
  });
});
