import { screen } from '@testing-library/react-native';

/**
 * Helpers for asserting what a rendered tree passes down.
 *
 * Jest stubs stylesheets, so a class name never resolves to a style in a test.
 * These read the props the tree actually carries — the roles named as class
 * names and the families applied as style — which is what a token-driven screen
 * can be checked against.
 */

type TreeNode = {
  props?: Record<string, unknown>;
  children?: unknown[];
};

function walkTree(visit: (node: TreeNode) => void) {
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const tree = node as TreeNode;
    visit(tree);
    (tree.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
}

export function collectClassNames(): string[] {
  const found: string[] = [];
  walkTree((node) => {
    const className = node.props?.className;
    if (typeof className === 'string') found.push(className);
  });
  return found;
}

export function collectFontFamilies(): string[] {
  const found: string[] = [];
  const readStyle = (style: unknown) => {
    if (Array.isArray(style)) {
      style.forEach(readStyle);
      return;
    }
    if (style && typeof style === 'object' && 'fontFamily' in style) {
      const family = (style as { fontFamily?: unknown }).fontFamily;
      if (typeof family === 'string') found.push(family);
    }
  };
  walkTree((node) => readStyle(node.props?.style));
  return found;
}
