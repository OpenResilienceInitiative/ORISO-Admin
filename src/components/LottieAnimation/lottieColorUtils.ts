/**
 * Recolors a Lottie animation's hard-coded source palette to theme colors at
 * runtime. Mirrors the approach used in ORISO-Frontend
 * (src/components/emptyState/lottieColorUtils.ts): walk the animation JSON,
 * find normalized [r, g, b, a] color arrays whose hex matches a known source
 * color, and swap in the replacement while preserving the alpha channel.
 *
 * The admin_panel animation ("16 Personnel") ships with two visual roles:
 *  - the figures / silhouettes are pure black (#000000)
 *  - the accents are teal (#33cccc / #34cccc) plus a couple of stray
 *    red (#ff0000) and magenta (#f204e6) details
 * On the dark login stage the black figures are invisible, so we remap both
 * roles to bright M3 container colors (see LottieAnimation/index.tsx).
 */
type LottieValue = Record<string, any> | any[];

// Teal accents + stray red/magenta details all map to the single accent role.
const SOURCE_ACCENT_COLORS = new Set(['#33cccc', '#34cccc', '#ff0000', '#f204e6']);
// The figures are pure black.
const SOURCE_SECONDARY_COLORS = new Set(['#000000']);

const normalizeHex = (value: string) => value.trim().toLowerCase();

const hexToLottieColor = (hex: string) => {
    const normalized = normalizeHex(hex).replace('#', '');

    return [
        parseInt(normalized.slice(0, 2), 16) / 255,
        parseInt(normalized.slice(2, 4), 16) / 255,
        parseInt(normalized.slice(4, 6), 16) / 255,
    ];
};

const lottieColorToHex = (value: number[]) =>
    `#${value
        .slice(0, 3)
        .map((channel) =>
            Math.round(channel * 255)
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;

const isNormalizedLottieColor = (value: unknown): value is number[] =>
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((channel) => typeof channel === 'number' && channel >= 0 && channel <= 1);

const getSourceColorRole = (value: unknown) => {
    if (!isNormalizedLottieColor(value)) {
        return null;
    }

    const sourceHex = lottieColorToHex(value);

    if (SOURCE_ACCENT_COLORS.has(sourceHex)) {
        return 'accent';
    }

    if (SOURCE_SECONDARY_COLORS.has(sourceHex)) {
        return 'secondary';
    }

    return null;
};

const replaceSourceColors = (
    value: unknown,
    replacementColors: Record<'accent' | 'secondary', number[]>,
): unknown => {
    const colorRole = getSourceColorRole(value);

    if (colorRole) {
        return [...replacementColors[colorRole], ...(value as number[]).slice(3)];
    }

    if (Array.isArray(value)) {
        return value.map((item) => replaceSourceColors(item, replacementColors));
    }

    if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};

        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
            result[key] = replaceSourceColors(item, replacementColors);
        });

        return result;
    }

    return value;
};

export const recolorLottieAccent = <T extends LottieValue>(
    animationData: T,
    accentColor: string,
    secondaryColor: string,
): T => {
    const replacementColors = {
        accent: hexToLottieColor(accentColor),
        secondary: hexToLottieColor(secondaryColor),
    };

    return replaceSourceColors(animationData, replacementColors) as T;
};
