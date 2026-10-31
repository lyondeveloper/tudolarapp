import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import AgreementConfirmScreen from '@/app/agreements/[id]/confirm';
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

describe('AgreementConfirmScreen (Stitch 3.2 adapted per ADR-0013)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders Pacto Cumplido breakdown in tabular figures, final civic verification checklist, and incident escalation without star ratings or reputation scores (ADR-0013)', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });
    store.dispatch(sessionEstablished({ accessToken: 'access-token' }));

    await render(
      <Provider store={store}>
        <AgreementConfirmScreen />
      </Provider>,
    );

    expect(screen.getByTestId('agreement-confirm-heading')).toBeTruthy();
    expect(screen.getByText('Intercambio en Sitio Exitoso')).toBeTruthy();
    expect(screen.getByText('100,00 USD')).toBeTruthy();
    expect(screen.getByText('3.920,00 VES')).toBeTruthy();
    expect(screen.getByText('Verificación Cívica Final')).toBeTruthy();

    // No 5-star rating or reputation score module per ADR-0013
    const serialized = JSON.stringify(screen.toJSON());
    expect(serialized).not.toMatch(/reputaci[oó]n/i);
    expect(serialized).not.toMatch(/calificaci[oó]n/i);

    // Incident report trigger
    await fireEvent.press(screen.getByTestId('agreement-start-incident'));
    expect(screen.getByTestId('agreement-incident-notice')).toBeTruthy();

    // Return to marketplace
    await fireEvent.press(screen.getByTestId('agreement-back-to-home'));
    expect(mockPush).toHaveBeenCalledWith('/home');
  });
});
