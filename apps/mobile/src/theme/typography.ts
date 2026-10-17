import type { TextStyle } from 'react-native';

/**
 * The approved typographic scale from the design system (Civic Trust Exchange).
 *
 * Sizes and line heights are points. The design states letter spacing in `em`,
 * converted here to points at each level's own size. Monetary values use
 * tabular figures so amounts and rates align when compared.
 *
 * React Native cannot synthesise a weight from a single static face reliably, so
 * each weight is loaded as its own family and a level resolves to the family
 * matching its weight.
 */

export type TypeLevel =
  | 'headline-xl'
  | 'headline-xl-mobile'
  | 'headline-lg'
  | 'headline-lg-mobile'
  | 'headline-md'
  | 'headline-sm'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label-lg'
  | 'label-md'
  | 'label-sm'
  | 'code-num';

export type FontWeight = '400' | '600' | '700';

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing?: number;
}

export const fontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

const FAMILY_BY_WEIGHT: Record<FontWeight, string> = {
  '400': fontFamilies.regular,
  '600': fontFamilies.semibold,
  '700': fontFamilies.bold,
};

export const typeScale: Record<TypeLevel, TypeStyle> = {
  'headline-xl': { fontSize: 36, lineHeight: 44, fontWeight: '700' },
  'headline-xl-mobile': { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  'headline-lg': { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  'headline-lg-mobile': { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  'headline-md': { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  'headline-sm': { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  'body-lg': { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  'body-md': { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  'body-sm': { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  'label-lg': { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.14 },
  'label-md': { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.24 },
  'label-sm': { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.33 },
  'code-num': { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: -0.16 },
};

/** Levels whose figures must align in a column. */
const TABULAR_LEVELS: ReadonlySet<TypeLevel> = new Set<TypeLevel>(['code-num']);

export function textStyle(level: TypeLevel): TextStyle {
  const style = typeScale[level];
  return {
    ...style,
    fontFamily: FAMILY_BY_WEIGHT[style.fontWeight],
    ...(TABULAR_LEVELS.has(level) ? { fontVariant: ['tabular-nums'] } : {}),
  };
}
