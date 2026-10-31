import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import HomeScreen from '@/app/home';
import {
  sessionEstablished,
  sessionReducer,
} from '@/features/session/session-slice';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Redirect: () => null,
}));

jest.mock('@/services/api', () => ({
  useCurrentUserQuery: () => ({
    data: {
      id: 'user-id',
      displayName: 'Demo User',
      username: 'demo',
      email: 'demo@tudolar.local',
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));

describe('HomeScreen (Stitch 2.1 Descubrimiento de Ofertas - Mercado Ojeda)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders the signed-in profile header, Ciudad Ojeda market banner, deterministic filter chips, offer cards, civic disclaimer, and bottom dock without forbidden labels', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

    await render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>,
    );

    // Preserves mobile/app-shell contract
    expect(screen.getByText('Signed in')).toBeTruthy();
    expect(screen.getByText('Demo User')).toBeTruthy();
    expect(screen.getByText('demo')).toBeTruthy();

    // Stitch 2.1 Marketplace Discovery elements
    expect(screen.getByText('Mercado Activo: Ciudad Ojeda')).toBeTruthy();
    expect(screen.getByText('Carlos M.')).toBeTruthy();
    expect(screen.getByText('Elena R.')).toBeTruthy();
    expect(screen.getByText('Inversiones Ojeda P2P')).toBeTruthy();
    expect(
      screen.getByText('Compromiso Comunitario y Cero Custodia'),
    ).toBeTruthy();

    // Filter chip interaction
    await fireEvent.press(screen.getByTestId('home-filter-USDT_USD_CASH'));
    expect(screen.queryByText('Carlos M.')).toBeNull();
    expect(screen.getByText('Inversiones Ojeda P2P')).toBeTruthy();

    // Tapping an offer card navigates to /offers/[id]
    await fireEvent.press(screen.getByTestId('home-filter-ALL'));
    await fireEvent.press(screen.getByTestId('offer-card-td-892'));
    expect(mockPush).toHaveBeenCalledWith('/offers/td-892');

    // No forbidden labels (password, Home, Explore, Zelle, ratings, earnings)
    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toMatch(/password/i);
    expect(rendered).not.toMatch(/zelle/i);
    expect(rendered).not.toMatch(/reputaci[oó]n/i);
    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.queryByText('Explore')).toBeNull();
  });
});
