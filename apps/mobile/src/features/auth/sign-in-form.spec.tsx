import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import {
  sessionCleared,
  sessionReducer,
} from '@/features/session/session-slice';
import { SignInForm } from './sign-in-form';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/api', () => ({
  useSignInWithPasswordMutation: () => [jest.fn()],
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));

describe('SignInForm (Stitch 1.1 & Passkeys)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('presents the Ciudad Ojeda node badge, passkey entry card, credentials inputs, privacy notice, and registration link', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionCleared());

    await render(
      <Provider store={store}>
        <SignInForm />
      </Provider>,
    );

    expect(screen.getByText(/Nodo Activo: Ciudad Ojeda/i)).toBeTruthy();
    expect(screen.getByTestId('sign-in-passkey-button')).toBeTruthy();
    expect(screen.getByTestId('sign-in-identifier')).toBeTruthy();
    expect(screen.getByTestId('sign-in-password')).toBeTruthy();
    expect(screen.getByTestId('sign-in-submit')).toBeTruthy();
    expect(screen.getByText(/Compromiso de Privacidad Local/i)).toBeTruthy();

    // Tapping passkey shows preview notice until T16 native WebAuthn wiring lands
    await fireEvent.press(screen.getByTestId('sign-in-passkey-button'));
    expect(screen.getByTestId('passkey-preview-notice')).toBeTruthy();

    // Tapping registration link routes to /register
    await fireEvent.press(screen.getByTestId('sign-in-go-to-register'));
    expect(mockPush).toHaveBeenCalledWith('/register');
  });
});
