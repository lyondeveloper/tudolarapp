import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The token layer is `src/global.css`, and it is the single source of truth for
 * colour. Jest stubs stylesheet imports, so a rendered `className="bg-primary"`
 * carries no `backgroundColor` and resolved colours cannot be asserted from a
 * component. The contract is therefore asserted where it actually lives.
 *
 * Values come from the approved design system (Civic Trust Exchange): the
 * authored brand palette named by its style guidelines and component specs.
 */
const GLOBAL_CSS = join(__dirname, '..', 'global.css');

/** Approved light values, as space-separated RGB triplets. */
const APPROVED_LIGHT_TOKENS: Record<string, string> = {
  // Institutional deep blue, used for primary actions and dominant titles.
  primary: '15 76 129',
  'primary-foreground': '255 255 255',
  // Emerald sage, reserved for affirmative and safe states.
  secondary: '5 150 105',
  'secondary-foreground': '255 255 255',
  success: '5 150 105',
  // Preventative amber, for non-custody and physical-safety notices.
  warning: '254 243 199',
  'warning-border': '245 158 11',
  'warning-foreground': '146 64 14',
  // Slate outlines: the stronger one for inputs and bars, the softer for cards.
  outline: '203 213 225',
  'outline-variant': '226 232 240',
  // Surfaces: the base canvas, then card and muted surfaces lifted off it.
  background: '248 250 252',
  surface: '255 255 255',
  'surface-muted': '241 245 249',
  foreground: '51 65 85',
  muted: '241 245 249',
  'muted-foreground': '100 116 139',
  card: '255 255 255',
  border: '226 232 240',
  input: '203 213 225',
  ring: '15 76 129',
  destructive: '186 26 26',
  accent: '241 245 249',
  'accent-foreground': '51 65 85',
  popover: '255 255 255',
  'popover-foreground': '51 65 85',
};

/**
 * Names the gluestack variants resolve by class name, such as `bg-primary`,
 * `text-primary-foreground`, and `border-border`. Renaming or dropping any of
 * them silently breaks a component variant, so their presence is asserted too.
 */
const NAMES_COMPONENTS_RESOLVE = [
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'background',
  'foreground',
  'card',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'border',
  'input',
  'ring',
  'destructive',
];

function readLightTokens(): Record<string, string> {
  const css = readFileSync(GLOBAL_CSS, 'utf8');
  const lightStart = css.indexOf('@variant light {');
  const darkStart = css.indexOf('@variant dark {');

  if (lightStart === -1) {
    throw new Error('global.css declares no @variant light block');
  }

  const lightBlock = css.slice(
    lightStart,
    darkStart === -1 ? undefined : darkStart,
  );

  const tokens: Record<string, string> = {};
  for (const match of lightBlock.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

describe('design tokens', () => {
  const tokens = readLightTokens();

  it('declares the approved brand value for every required role', () => {
    for (const [name, value] of Object.entries(APPROVED_LIGHT_TOKENS)) {
      expect({ name, value: tokens[name] }).toEqual({ name, value });
    }
  });

  it('keeps every token name the component variants resolve', () => {
    for (const name of NAMES_COMPONENTS_RESOLVE) {
      expect(tokens).toHaveProperty(name);
    }
  });

  it('expresses every colour as a space-separated RGB triplet', () => {
    for (const [name, value] of Object.entries(tokens)) {
      expect({ name, isTriplet: /^\d{1,3} \d{1,3} \d{1,3}$/.test(value) }).toEqual(
        { name, isTriplet: true },
      );
    }
  });

  it('keeps the dark presentation reachable', () => {
    const css = readFileSync(GLOBAL_CSS, 'utf8');
    expect(css).toContain('@variant dark {');
  });
});
