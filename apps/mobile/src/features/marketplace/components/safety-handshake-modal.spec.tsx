import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafetyHandshakeModal } from './safety-handshake-modal';

describe('SafetyHandshakeModal', () => {
  it('gates confirmation until the 3-point civic safety checkbox is acknowledged', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    await render(
      <SafetyHandshakeModal
        visible
        sellerName="Carlos M."
        corridorLabel="CC Ojeda Mall"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Compromiso Cívico')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('safety-handshake-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('safety-handshake-checkbox'));
    await fireEvent.press(screen.getByTestId('safety-handshake-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
