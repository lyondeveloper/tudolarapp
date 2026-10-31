import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import SearchScreen from '@/app/search';
import {
  sessionEstablished,
  sessionReducer,
} from '@/features/session/session-slice';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  Redirect: () => null,
}));

describe('SearchScreen (Stitch 2.0 adapted per ADR-0015)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('presents deterministic manual filter controls, displays the ADR-0015 AI deferral notice, and filters Ciudad Ojeda offers', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

    await render(
      <Provider store={store}>
        <SearchScreen />
      </Provider>,
    );

    expect(screen.getByTestId('search-screen-heading')).toBeTruthy();
    expect(screen.getByTestId('search-ai-deferral-notice')).toBeTruthy();
    expect(screen.getByText('Carlos M.')).toBeTruthy();
    expect(screen.getByText('Elena R.')).toBeTruthy();

    // Filter by corridor Plaza Bolívar
    await fireEvent.press(
      screen.getByTestId('search-corridor-plaza-bolivar'),
    );
    expect(screen.queryByText('Carlos M.')).toBeNull();
    expect(screen.getByText('Elena R.')).toBeTruthy();
  });
});
