import { contrastRatio } from './contrastRatio';
import { readableOn } from './theme/orisoScheme';

/**
 * WCAG contrast rating for a theme colour against the text the theme draws on
 * it (ORISO-Admin#1374). Presentation only — the admin shows it next to each
 * colour; nothing here changes how colours are saved.
 *
 * The luminance/ratio maths is the shared WCAG 2.x implementation in
 * `contrastRatio.ts`; the text colour is the theme's own `readableOn` rule
 * (white or the dark text token, whichever reads better), so the badge rates
 * exactly the pairing the app renders.
 */

export type ContrastLevel = 'AAA' | 'AA' | 'fail';

export interface ColorContrastRating {
    /** Normalised `#rrggbb` of the rated colour. */
    color: string;
    /** Text colour drawn on `color` (`#ffffff` or the theme's dark text). */
    textColor: string;
    /** True when the text drawn on the colour is white. */
    whiteText: boolean;
    /** Unrounded WCAG ratio, 1–21. */
    ratio: number;
    level: ContrastLevel;
}

/** WCAG 2.x SC 1.4.6 (AAA) and 1.4.3 (AA) thresholds for normal text. */
export const AAA_MIN_RATIO = 7;
export const AA_MIN_RATIO = 4.5;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` / `abc` / `#AABBCC` → `#aabbcc`; anything else → `undefined`. */
export const normalizeHexColor = (value?: string | null): string | undefined => {
    const match = value?.trim().match(HEX);
    if (!match) {
        return undefined;
    }
    const digits = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
    return `#${digits.toLowerCase()}`;
};

export const contrastLevel = (ratio: number): ContrastLevel => {
    if (ratio >= AAA_MIN_RATIO) {
        return 'AAA';
    }
    return ratio >= AA_MIN_RATIO ? 'AA' : 'fail';
};

/** Rates `color` against the text the theme draws on it; `undefined` for anything that is not a hex colour. */
export const rateColorContrast = (color?: string | null): ColorContrastRating | undefined => {
    const hex = normalizeHexColor(color);
    if (!hex) {
        return undefined;
    }
    const textColor = readableOn(hex);
    const ratio = contrastRatio(hex, textColor);
    return { color: hex, textColor, whiteText: textColor === '#ffffff', ratio, level: contrastLevel(ratio) };
};

/**
 * One decimal, rounded DOWN, in the locale's number format ("4,4" / "4.4").
 * Rounding down keeps the shown number honest: 4.47 must never read as "4,5"
 * next to a "too weak" badge.
 */
export const formatContrastRatio = (ratio: number, locale?: string): string => {
    const floored = Math.floor(ratio * 10) / 10;
    try {
        // App languages like `de@informal` are not BCP 47; Intl needs the base tag.
        return new Intl.NumberFormat(locale?.split('@')[0], {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(floored);
    } catch {
        return floored.toFixed(1);
    }
};
