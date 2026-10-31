import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RegisterForm } from './register-form';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
}));

describe('RegisterForm (Stitch 1.2 Registro y Verificación)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  it('validates required fields and the 3-point civic trust pact without requiring a Venezuelan Cédula (ADR-0013)', async () => {
    await render(<RegisterForm />);

    expect(screen.getByText('Datos y Verificación Cívica')).toBeTruthy();
    expect(screen.getByText('Pacto de Confianza Ojeda')).toBeTruthy();
    expect(screen.queryByText(/Cédula de Identidad/i)).toBeNull();

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
      expect(screen.getByTestId('register-preview-confirmation')).toBeTruthy();
    });
  });
});
