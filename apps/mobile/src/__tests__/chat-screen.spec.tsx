import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import ChatScreen from '@/app/chat/[id]';
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

describe('ChatScreen (Stitch 3.1 Chat y Coordinación de Encuentro)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders offer context pill, non-custody banner, Pacto de Encuentro card, alternate meeting point modal, message composer, and incident modal', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

    await render(
      <Provider store={store}>
        <ChatScreen />
      </Provider>,
    );

    expect(screen.getByText('Pacto de Encuentro')).toBeTruthy();
    expect(screen.getByText('100,00 USD')).toBeTruthy();
    expect(screen.getByText('3.920,00 VES')).toBeTruthy();

    // Propose another verified meeting point
    await fireEvent.press(screen.getByTestId('chat-propose-venue-button'));
    expect(screen.getByTestId('chat-verified-venues-modal')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-venue-option-plaza-bolivar'));
    expect(
      screen.getByText('Plaza Bolívar / Casco Central'),
    ).toBeTruthy();

    // Open incident report modal
    await fireEvent.press(screen.getByTestId('chat-open-incident-modal'));
    expect(screen.getByTestId('chat-incident-modal')).toBeTruthy();

    // Accept agreement -> navigates to /agreements/td-892/confirm
    await fireEvent.press(screen.getByTestId('chat-accept-agreement'));
    expect(mockPush).toHaveBeenCalledWith('/agreements/td-892/confirm');
  });
});
