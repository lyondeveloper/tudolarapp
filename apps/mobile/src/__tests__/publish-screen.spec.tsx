import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import PublishScreen from '@/app/publish';
import {
  sessionEstablished,
  sessionReducer,
} from '@/features/session/session-slice';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  Redirect: () => null,
}));

describe('PublishScreen (Stitch 4.1 Publicar Oferta - Vendedores)', () => {
  it('renders canonical pair selector, seller-set rate, equivalence box, pilot entitlement badge (ADR-0014), and no earnings labels (ADR-0018)', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

    await render(
      <Provider store={store}>
        <PublishScreen />
      </Provider>,
    );

    expect(screen.getByText('Publicar Oferta')).toBeTruthy();
    expect(
      screen.getByText(/Habilitación Piloto Activa/i),
    ).toBeTruthy();
    expect(screen.getByText(/784,00 – 9.800,00 VES/i)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('publish-offer-submit'));
    expect(screen.getByTestId('publish-preview-confirmation')).toBeTruthy();

    const serialized = JSON.stringify(screen.toJSON());
    expect(serialized).not.toMatch(/ganancias|earnings|profit/i);
    expect(serialized).not.toMatch(/zelle/i);
  });
});
