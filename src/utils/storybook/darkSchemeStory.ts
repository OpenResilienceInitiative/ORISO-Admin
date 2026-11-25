import { contrastRatio } from '../contrastRatio';

/**
 * Storybook-only: put `globals: { scheme: 'dark' }` on a story to render it in the personal dark
 * scheme (see the `scheme` global in .storybook/preview.tsx). These helpers measure what the
 * reader sees: a text that is hard-coded or on a theme-invariant fill shows up as an unreadable pair.
 */
export const DARK_SCHEME_GLOBALS = { scheme: 'dark' } as const;

const rgbToHex = (rgb: string): string => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0'])
        .slice(0, 3)
        .map((part) => Math.round(Number(part)));
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
};

/** First ancestor (or the element itself) with an opaque background: what the text sits on. */
const paintedBackground = (element: Element): string => {
    let node: Element | null = element;
    while (node) {
        const { backgroundColor } = getComputedStyle(node);
        const alpha = backgroundColor.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1];
        if (backgroundColor !== 'transparent' && (alpha === undefined || Number(alpha) === 1)) {
            return rgbToHex(backgroundColor);
        }
        node = node.parentElement;
    }
    return '#ffffff';
};

/** WCAG contrast of an element's text colour against the surface it is painted on. */
export const textContrast = (element: Element): number =>
    contrastRatio(rgbToHex(getComputedStyle(element).color), paintedBackground(element));
