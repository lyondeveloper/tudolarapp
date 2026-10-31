import { fireEvent, render, screen } from '@testing-library/react-native';

import { MarketNodeBanner } from './market-node-banner';

describe('MarketNodeBanner', () => {
  it('renders the active Ciudad Ojeda node and toggles the geofence info panel', async () => {
    await render(<MarketNodeBanner />);

    expect(screen.getByText('Mercado Activo: Ciudad Ojeda')).toBeTruthy();
    expect(screen.getByText('Polígono Lagunillas • Zulia Central')).toBeTruthy();
    expect(screen.queryByText(/Cabimas y Maracaibo/i)).toBeNull();

    await fireEvent.press(screen.getByTestId('market-node-toggle'));

    expect(
      screen.getByText(/Cabimas y Maracaibo: Próxima fase piloto/i),
    ).toBeTruthy();
  });
});
