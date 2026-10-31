import { render, screen } from '@testing-library/react-native';

import { collectClassNames } from '@/test-support/render-tree';
import { CivicNoticeBanner } from './civic-notice-banner';

describe('CivicNoticeBanner', () => {
  it('renders the title, body, and preventative amber token classes', async () => {
    await render(
      <CivicNoticeBanner
        title="Plataforma Cívica Sin Custodia"
        body="TUDOLAR no custodia dinero ni media en el efectivo."
        testID="civic-notice"
      />,
    );

    expect(screen.getByText('Plataforma Cívica Sin Custodia')).toBeTruthy();
    expect(
      screen.getByText('TUDOLAR no custodia dinero ni media en el efectivo.'),
    ).toBeTruthy();

    const classes = collectClassNames().join(' ');
    expect(classes).toContain('bg-warning');
    expect(classes).toContain('border-warning-border');
    expect(classes).toContain('text-warning-foreground');
  });
});
