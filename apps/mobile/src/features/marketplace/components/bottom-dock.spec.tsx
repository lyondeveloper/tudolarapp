import { fireEvent, render, screen } from '@testing-library/react-native';

import { BottomDock } from './bottom-dock';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('BottomDock', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders the 5 destinations without Home or Explore labels and navigates on press', async () => {
    await render(<BottomDock activeTab="offers" />);

    expect(screen.getByText('Ofertas')).toBeTruthy();
    expect(screen.getByText('Buscar')).toBeTruthy();
    expect(screen.getByText('Publicar')).toBeTruthy();
    expect(screen.getByText('Acuerdos')).toBeTruthy();
    expect(screen.getByText('Perfil')).toBeTruthy();
    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.queryByText('Explore')).toBeNull();

    await fireEvent.press(screen.getByTestId('dock-search'));
    expect(mockPush).toHaveBeenCalledWith('/search');

    await fireEvent.press(screen.getByTestId('dock-publish'));
    expect(mockPush).toHaveBeenCalledWith('/publish');

    await fireEvent.press(screen.getByTestId('dock-profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });
});
