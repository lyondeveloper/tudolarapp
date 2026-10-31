import { fireEvent, render, screen } from '@testing-library/react-native';

import { OFFERS_PREVIEW } from '@/features/marketplace/domain/preview-data';
import { collectFontFamilies } from '@/test-support/render-tree';
import { fontFamilies } from '@/theme/typography';
import { OfferCard } from './offer-card';

describe('OfferCard', () => {
  it('renders offer details in tabular typography and calls onSelect', async () => {
    const onSelect = jest.fn();
    const offer = OFFERS_PREVIEW[0];

    await render(<OfferCard offer={offer} onSelect={onSelect} />);

    expect(screen.getByText('Carlos M.')).toBeTruthy();
    expect(screen.getByText('39,20 VES/USD')).toBeTruthy();
    expect(screen.getByText('Av. Intercomunal / CC Ojeda Mall')).toBeTruthy();
    expect(collectFontFamilies()).toContain(fontFamilies.bold);

    await fireEvent.press(screen.getByTestId('offer-card-td-892'));
    expect(onSelect).toHaveBeenCalledWith('td-892');
  });
});
