import { TenantSeeds } from '../themeSeeds';

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

const defaultPrimaryTokens = (primary: string) => {
    if (primary === '#a5000a') {
        return {
            primaryContainer: '#ffdad5',
            primaryFixed: '#ffdad5',
            primaryFixedDim: '#ffb4aa',
            primaryAction: '#cc1e1c',
            onPrimaryFixedVariant: '#930008',
        };
    }

    return {
        primaryContainer: mix(primary, '#ffffff', 0.82),
        primaryFixed: mix(primary, '#ffffff', 0.84),
        primaryFixedDim: mix(primary, '#ffffff', 0.68),
        primaryAction: primary,
        onPrimaryFixedVariant: mix(primary, '#000000', 0.12),
    };
};

export const computeOrisoPalette = (seeds: TenantSeeds): OrisoPaletteResult => {
    const primary = normalizeHex(seeds.primary) ?? '#a5000a';
    const explicitAccent = normalizeHex(seeds.accent);
    const accent = explicitAccent ?? primary;
    const onPrimary = luminance(primary) > 0.62 ? '#141c25' : '#ffffff';
    const { primaryContainer, primaryFixed, primaryFixedDim, primaryAction, onPrimaryFixedVariant } =
        defaultPrimaryTokens(primary);
    const onPrimaryContainer = luminance(primaryContainer) > 0.62 ? '#141c25' : '#ffffff';
    const onAccent = luminance(accent) > 0.62 ? '#141c25' : '#ffffff';

    return {
        tooPale: saturation(primary) < 0.12,
        tokens: {
            '--m3-primary': primary,
            '--m3-on-primary': onPrimary,
            '--m3-primary-container': primaryContainer,
            '--m3-on-primary-container': onPrimaryContainer,
            '--m3-primary-fixed': primaryFixed,
            '--m3-primary-fixed-dim': primaryFixedDim,
            '--m3-on-primary-fixed-variant': onPrimaryFixedVariant,
            '--m3-secondary': '#4c555f',
            '--m3-on-secondary': '#ffffff',
            '--m3-secondary-container': '#646d78',
            '--m3-on-secondary-container': '#e7effc',
            '--m3-error': '#b1005e',
            '--m3-on-error': '#ffffff',
            '--m3-warning': '#946200',
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
            '--oriso-app-accent': accent,
            '--oriso-app-on-accent': onAccent,
            '--oriso-app-accent-container': explicitAccent ? mix(accent, '#ffffff', 0.84) : primaryFixed,
            '--oriso-app-chat-surface': '#ffffff',
            '--oriso-app-action': explicitAccent ?? primaryAction,
        },
    };
};
