import { contrastRatio } from '../contrastRatio';

/**
 * Storybook-only: put `globals: { scheme: 'dark' }` on a story to render it in the personal dark
 * scheme (see the `scheme` global in .storybook/preview.tsx). These helpers measure what the
 * reader sees: a text that is hard-coded or on a theme-invariant fill shows up as an unreadable pair.
 */
export const DARK_SCHEME_GLOBALS = { scheme: 'dark' } as const;

type Rgba = [number, number, number, number];

/** `rgb(...)` / `rgba(...)` / `transparent` → [r, g, b, alpha]. Space- and comma-separated forms. */
const parseColor = (value: string): Rgba => {
    if (value.trim() === 'transparent') return [0, 0, 0, 0];
    const parts = (value.match(/\d+(\.\d+)?%?/g) ?? []).map((part) =>
        part.endsWith('%') ? Number(part.slice(0, -1)) / 100 : Number(part),
    );
    const [r = 0, g = 0, b = 0, a = 1] = parts;
    return [r, g, b, a];
};

const toHex = ([r, g, b]: Rgba): string =>
    `#${[r, g, b].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;

/** Source-over: `top` (with its alpha) painted on an opaque `base`. */
const over = (top: Rgba, base: Rgba): Rgba => {
    const [r, g, b, a] = top;
    return [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a), 1];
};

/**
 * The colour the text actually sits on: walk up until an opaque background (the page is white
 * below everything), then composite every translucent layer on the way back down. Fully
 * transparent layers add nothing, so the lookup passes through them.
 */
const paintedBackground = (element: Element): Rgba => {
    const layers: Rgba[] = [];
    let node: Element | null = element;
    while (node) {
        const layer = parseColor(getComputedStyle(node).backgroundColor);
        if (layer[3] >= 1) {
            return layers.reduceRight((base, top) => over(top, base), layer);
        }
        if (layer[3] > 0) layers.push(layer);
        node = node.parentElement;
    }
    return layers.reduceRight((base, top) => over(top, base), [255, 255, 255, 1] as Rgba);
};

/** WCAG contrast of an element's text colour against the surface it is painted on. */
export const textContrast = (element: Element): number => {
    const background = paintedBackground(element);
    const text = over(parseColor(getComputedStyle(element).color), background);
    return contrastRatio(toHex(text), toHex(background));
};
