import { getAccentDark, getAccentLight, TenantSeeds } from '../themeSeeds';

export interface OrisoPaletteResult {
    tokens: Record<string, string>;
    tooPale: boolean;
}

const normalizeHex = (value?: string): string | undefined => {
    if (!value) {
        return undefined;
    }
    const withHash = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
    if (/^#[0-9a-f]{3}$/i.test(withHash)) {
        return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toLowerCase();
    }
    return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : undefined;
};

const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
        .map((value) =>
            Math.max(0, Math.min(255, Math.round(value)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;

const mix = (a: string, b: string, amount: number) => {
    const start = hexToRgb(a);
    const end = hexToRgb(b);
    return rgbToHex(
        start.r + (end.r - start.r) * amount,
        start.g + (end.g - start.g) * amount,
        start.b + (end.b - start.b) * amount,
    );
};

const luminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const saturation = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
};

const DEFAULT_ACCENT_DARK = '#a5000a';
const DEFAULT_ACCENT_LIGHT = '#ffdad5';
const DEFAULT_ACCENT_DIM = '#ffb4aa';
const DEFAULT_ACCENT_ACTION = '#cc1e1c';
const SYSTEM_ALERT = '#410001';
const SYSTEM_ERROR = '#b1005e';

const defaultAccentTokens = (accentDark: string, explicitAccentLight?: string) => {
    if (!explicitAccentLight && accentDark === DEFAULT_ACCENT_DARK) {
        return {
            accentLight: DEFAULT_ACCENT_LIGHT,
            accentDim: DEFAULT_ACCENT_DIM,
            accentAction: DEFAULT_ACCENT_ACTION,
            onAccentLightVariant: '#930008',
        };
    }

    const accentLight = explicitAccentLight ?? mix(accentDark, '#ffffff', 0.84);

    return {
        accentLight,
        accentDim: mix(accentLight, accentDark, 0.16),
        accentAction: accentDark,
        onAccentLightVariant: mix(accentDark, '#000000', 0.12),
    };
};

export const computeOrisoPalette = (seeds: TenantSeeds): OrisoPaletteResult => {
    const accentDark = normalizeHex(getAccentDark(seeds)) ?? DEFAULT_ACCENT_DARK;
    const explicitAccentLight = normalizeHex(getAccentLight(seeds));
    const { accentLight, accentDim, accentAction, onAccentLightVariant } = defaultAccentTokens(
        accentDark,
        explicitAccentLight,
    );
    const onAccentDark = luminance(accentDark) > 0.62 ? '#141c25' : '#ffffff';
    const onAccentLight = luminance(accentLight) > 0.62 ? '#141c25' : '#ffffff';
    const onAccentAction = luminance(accentAction) > 0.62 ? '#141c25' : '#ffffff';

    return {
        tooPale: saturation(accentDark) < 0.12,
        tokens: {
            '--m3-primary': accentDark,
            '--m3-on-primary': onAccentDark,
            '--m3-primary-container': accentLight,
            '--m3-on-primary-container': onAccentLight,
            '--m3-primary-fixed': accentLight,
            '--m3-primary-fixed-dim': accentDim,
            '--m3-on-primary-fixed-variant': onAccentLightVariant,
            '--m3-secondary': '#4c555f',
            '--m3-on-secondary': '#ffffff',
            '--m3-secondary-container': '#646d78',
            '--m3-on-secondary-container': '#e7effc',
            '--m3-error': SYSTEM_ERROR,
            '--m3-on-error': '#ffffff',
            '--m3-warning': SYSTEM_ALERT,
            '--m3-on-warning': '#ffffff',
            '--m3-surface': '#fcf9f9',
            '--m3-on-surface': '#1a1c1e',
            '--m3-surface-container-low': '#f7f3f4',
            '--m3-surface-container': '#f0edee',
            '--m3-surface-container-high': '#eae7e8',
            '--m3-surface-container-highest': '#e4e2e2',
            '--m3-on-surface-variant': '#444748',
            '--m3-outline': '#747878',
            '--m3-outline-variant': '#c4c7c8',
            '--oriso-app-accent': accentDark,
            '--oriso-app-accent-dark': accentDark,
            '--oriso-app-accent-light': accentLight,
            '--oriso-app-on-accent': onAccentDark,
            '--oriso-app-accent-container': accentLight,
            '--oriso-app-chat-surface': '#ffffff',
            '--oriso-app-action': accentAction,
            '--oriso-app-on-action': onAccentAction,
        },
    };
};
