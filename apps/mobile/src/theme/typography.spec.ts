import {
  fontFamilies,
  textStyle,
  typeScale,
  type TypeLevel,
} from './typography';

/**
 * The approved typographic scale from the design system (Civic Trust Exchange).
 * Sizes and line heights are points; the design states letter spacing in `em`,
 * which is converted here to points at each level's own size.
 */
const APPROVED_SCALE: Record<TypeLevel, {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '600' | '700';
  letterSpacing?: number;
}> = {
  'headline-xl': { fontSize: 36, lineHeight: 44, fontWeight: '700' },
  'headline-xl-mobile': { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  'headline-lg': { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  'headline-lg-mobile': { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  'headline-md': { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  'headline-sm': { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  'body-lg': { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  'body-md': { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  'body-sm': { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  // 0.01em at 14px
  'label-lg': { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.14 },
  // 0.02em at 12px
  'label-md': { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.24 },
  // 0.03em at 11px
  'label-sm': { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.33 },
  // -0.01em at 16px
  'code-num': { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: -0.16 },
};

describe('typography', () => {
  it('declares the approved size, weight, and line height for every level', () => {
    for (const [level, expected] of Object.entries(APPROVED_SCALE)) {
      expect({ level, style: typeScale[level as TypeLevel] }).toEqual({
        level,
        style: expected,
      });
    }
  });

  it('loads the approved typeface for each weight', () => {
    expect(fontFamilies).toEqual({
      regular: 'PlusJakartaSans_400Regular',
      semibold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
    });
  });

  it('resolves a level to the family matching its weight', () => {
    expect(textStyle('headline-xl').fontFamily).toBe(fontFamilies.bold);
    expect(textStyle('headline-md').fontFamily).toBe(fontFamilies.semibold);
    expect(textStyle('body-md').fontFamily).toBe(fontFamilies.regular);
  });

  it('keeps the size, line height, and spacing of the level it resolves', () => {
    const style = textStyle('label-md');
    expect(style.fontSize).toBe(12);
    expect(style.lineHeight).toBe(16);
    expect(style.letterSpacing).toBe(0.24);
  });

  it('renders monetary values with tabular figures', () => {
    expect(textStyle('code-num').fontVariant).toEqual(['tabular-nums']);
  });
});
