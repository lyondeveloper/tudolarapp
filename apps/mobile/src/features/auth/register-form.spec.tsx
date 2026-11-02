import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import { sessionReducer } from '@/features/session/session-slice';
import { RegisterForm } from './register-form';

const mockReplace = jest.fn();
const mockRegister = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
}));

jest.mock('@/services/api', () => ({
  useRegisterWithPasswordMutation: () => [mockRegister],
}));

describe('RegisterForm (Stitch 1.2 Registro y Verificación)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockRegister.mockReset();
    mockRegister.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ message: 'Registration accepted' }),
    });
  });

  it('validates required fields and the 3-point civic trust pact without requiring a Venezuelan Cédula (ADR-0013)', async () => {
    const store = configureStore({ reducer: { session: sessionReducer } });

    await render(
      <Provider store={store}>
        <RegisterForm />
      </Provider>,
    );

    expect(screen.getByText('Datos y Verificación Cívica')).toBeTruthy();
    expect(screen.getByText('Pacto de Confianza Ojeda')).toBeTruthy();
    expect(screen.queryByText(/Cédula de Identidad/i)).toBeNull();
    // Identity is global: no municipal sector selector during account registration
    expect(screen.queryByText(/Sector Frecuente en Ciudad Ojeda/i)).toBeNull();
    expect(screen.queryByTestId('register-sector-corridor-intercomunal')).toBeNull();

    // Submit empty form -> validation errors appear
    await fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() => {
      expect(screen.getByText('Ingresa tu nombre completo')).toBeTruthy();
      expect(screen.getByText('Ingresa un nombre de usuario')).toBeTruthy();
      expect(screen.getByText('Ingresa tu correo electrónico')).toBeTruthy();
      expect(
        screen.getByText('Debes aceptar el Pacto de Confianza Ojeda'),
      ).toBeTruthy();
    });

    // Fill required fields and accept the pact
    await fireEvent.changeText(
      screen.getByTestId('register-display-name'),
      'María Pérez',
    );
    await fireEvent.changeText(
      screen.getByTestId('register-username'),
      'mariaperez',
    );
    await fireEvent.changeText(
      screen.getByTestId('register-email'),
      'maria@tudolar.local',
    );
    await fireEvent.changeText(
      screen.getByTestId('register-password'),
      'clave-segura-123',
    );
    await fireEvent.press(screen.getByTestId('register-pact-checkbox'));
    await fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        displayName: 'María Pérez',
        username: 'mariaperez',
        email: 'maria@tudolar.local',
        password: 'clave-segura-123',
      });
      expect(screen.getByTestId('register-success-confirmation')).toBeTruthy();
    });
  });
});
