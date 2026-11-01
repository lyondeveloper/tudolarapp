import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import ProfileScreen from '@/app/profile';
import {
  sessionCleared,
  sessionEstablished,
  sessionReducer,
} from '@/features/session/session-slice';
import { marketReducer } from '@/features/marketplace/market-slice';

const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  Redirect: () => null,
}));

jest.mock('@/services/api', () => ({
  useCurrentUserQuery: () => ({
    data: {
      id: 'user-123',
      displayName: 'Carlos Mendoza',
      username: 'carlos_m',
      email: 'carlos@tudolar.local',
      emailVerified: true,
      phoneNumber: '+584141234567',
      phoneVerified: true,
      accountStatus: 'active',
      authMethods: ['password'],
    },
    isLoading: false,
    isError: false,
  }),
  useSellerEligibilityQuery: () => ({
    data: {
      sellerId: 'user-123',
      state: 'eligible',
    },
    isLoading: false,
  }),
  useLogoutMutation: () => [mockLogout, { isLoading: false }],
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLogout.mockReset();
    mockLogout.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('renders user details, verification badges, seller state, market switcher, and logout when authenticated', async () => {
    const store = configureStore({
      reducer: { session: sessionReducer, market: marketReducer },
    });
    store.dispatch(sessionEstablished({ accessToken: 'valid-token' }));

    await render(
      <Provider store={store}>
        <ProfileScreen />
      </Provider>,
    );

    expect(screen.getByText('Carlos Mendoza')).toBeTruthy();
    expect(screen.getByText('@carlos_m')).toBeTruthy();
    expect(screen.getByText('carlos@tudolar.local')).toBeTruthy();
    expect(screen.getByText('+584141234567')).toBeTruthy();
    expect(screen.getByText(/Vendedor Habilitado/i)).toBeTruthy();
    expect(screen.getByText(/Mercado Activo/i)).toBeTruthy();
    expect(screen.getByTestId('profile-logout-button')).toBeTruthy();
    expect(screen.getByTestId('stitch-bottom-dock')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('profile-logout-button'));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('blocks unauthenticated visitors with RequireAuthenticated and does not render profile or guest prompt', async () => {
    const store = configureStore({
      reducer: { session: sessionReducer, market: marketReducer },
    });
    store.dispatch(sessionCleared());

    await render(
      <Provider store={store}>
        <ProfileScreen />
      </Provider>,
    );

    expect(screen.queryByText(/Modo Invitado/i)).toBeNull();
    expect(screen.queryByTestId('profile-guest-sign-in')).toBeNull();
    expect(screen.queryByText('Carlos Mendoza')).toBeNull();
    expect(screen.queryByTestId('profile-logout-button')).toBeNull();
  });
});
