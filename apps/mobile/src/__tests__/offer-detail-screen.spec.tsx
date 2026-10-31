import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import OfferDetailScreen from '@/app/offers/[id]';
import {
  sessionEstablished,
  sessionReducer,
} from '@/features/session/session-slice';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'td-892' }),
  Redirect: () => null,
}));

describe('OfferDetailScreen (Stitch 2.2 Detalle de Oferta y Perfil Vendedor)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders offer terms, safe corridor details, and requires acknowledging SafetyHandshakeModal before navigating to /chat/[id]', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

    await render(
      <Provider store={store}>
        <OfferDetailScreen />
      </Provider>,
    );

    expect(screen.getByText('Detalle De Oferta')).toBeTruthy();
    expect(screen.getByText('Carlos M.')).toBeTruthy();
    expect(screen.getByText('39,20 VES/USD')).toBeTruthy();
    expect(screen.getByText('Protocolo de Cautela Cívica')).toBeTruthy();

    // Open safety handshake modal
    await fireEvent.press(screen.getByTestId('offer-detail-start-chat'));
    expect(screen.getByTestId('safety-handshake-modal')).toBeTruthy();

    // Cannot proceed before acknowledging checkbox
    await fireEvent.press(screen.getByTestId('safety-handshake-confirm'));
    expect(mockPush).not.toHaveBeenCalled();

    // Acknowledge checkbox and confirm -> navigates to /chat/td-892
    await fireEvent.press(screen.getByTestId('safety-handshake-checkbox'));
    await fireEvent.press(screen.getByTestId('safety-handshake-confirm'));
    expect(mockPush).toHaveBeenCalledWith('/chat/td-892');
  });
});
