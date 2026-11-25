/**
 * Re-tone a neutral colour: same hue and colourfulness, new lightness. M3 "tone" is CIE L*, and for
 * the near-grey neutral ladder keeping a* / b* is a close stand-in for HCT. Tone 0 and 100 are pure
 * black and white, as in M3.
 */
const srgbToLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const linearToSrgb = (v: number) => {
    const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

// D65 white point.
const WHITE = [0.95047, 1, 1.08883] as const;
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;
const f = (t: number) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const fInverse = (t: number) => (t ** 3 > EPSILON ? t ** 3 : (116 * t - 16) / KAPPA);

const toLab = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(h.slice(i, i + 2), 16)));
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / WHITE[0];
    const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / WHITE[1];
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / WHITE[2];
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};

const fromLab = ([l, a, b]: [number, number, number]): string => {
    const fy = (l + 16) / 116;
    const x = fInverse(fy + a / 500) * WHITE[0];
    const y = fInverse(fy) * WHITE[1];
    const z = fInverse(fy - b / 200) * WHITE[2];
    const rgb = [
        3.2406 * x - 1.5372 * y - 0.4986 * z,
        -0.9689 * x + 1.8758 * y + 0.0415 * z,
        0.0557 * x - 0.204 * y + 1.057 * z,
    ].map(linearToSrgb);
    return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

export const toneOf = (hex: string, tone: number): string => {
    if (tone <= 0) return '#000000';
    if (tone >= 100) return '#ffffff';
    const [, a, b] = toLab(hex);
    return fromLab([tone, a, b]);
};
