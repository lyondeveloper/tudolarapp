import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import RegisterScreen from '@/app/register';
import {
  sessionCleared,
  sessionReducer,
} from '@/features/session/session-slice';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  Redirect: () => null,
}));

describe('RegisterScreen', () => {
  it('renders the community registration screen for anonymous users', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionCleared());

    await render(
      <Provider store={store}>
        <RegisterScreen />
      </Provider>,
    );

    expect(screen.getByText('Datos y Verificación Cívica')).toBeTruthy();
    expect(screen.getByTestId('register-submit')).toBeTruthy();
  });
});
