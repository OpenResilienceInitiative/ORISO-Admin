import { getAccentDark, getAccentLight, TenantSeeds } from '../themeSeeds';

export type OrisoSchemeName = 'light' | 'inverted';

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

const srgbChannelToLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// WCAG relative luminance (not the raw-sRGB shortcut): channels are gamma-decoded
// before weighting, or saturated colors like #00cc00 come out lighter than they
// actually render and readableOn() below picks a foreground that fails contrast.
const relativeLuminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
};

const contrastRatio = (hexA: string, hexB: string) => {
    const a = relativeLuminance(hexA);
    const b = relativeLuminance(hexB);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const saturation = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
};

const DEFAULT_ACCENT_DARK = '#a5000a';
/**
 * The rose SURFACE of the active pill — Figma's `M3/sys/light/on-primary-container`
 * value (#594.13b: "Figma hat Vorrang"). It lands on `--m3-primary-container`
 * (and its `primary-fixed`/`admin-field-selected-surface` mirrors), never on
 * `--m3-on-primary-container`: `on-*` is the readable FOREGROUND here, computed
 * by {@link readableOn}. Must stay identical to `--m3-primary-container` in
 * src/app.css, which is the static fallback for exactly this seed.
 */
const DEFAULT_ACCENT_LIGHT = '#ffe2de';
const DEFAULT_ACCENT_DIM = '#ffb4aa';
const DEFAULT_ACCENT_ACTION = '#cc1e1c';
/**
 * Active-indicator tone of the mobile bottom navigation for the default seed
 * #A5000A, taken 1:1 from Figma 56576:34607 ("Figma hat Vorrang"). Numerically
 * identical to SYSTEM_ALERT below, but a different role — do not merge them.
 */
const DEFAULT_NAV_INDICATOR = '#410001';
/**
 * The dark stage surface: the desktop sidebar AND the public sign-in stage
 * panel (#594.13a). Figma calls the style `M3/sys/light/on-background`, so the
 * token keeps that name although this palette then uses an M3 *system* name in
 * an INVERTED way (a surface, not a foreground) — the same deliberate stopgap
 * as the mail palette, because there is no real dark-mode token set yet. It is
 * seed-independent on purpose: both surfaces must resolve to the identical
 * value in every scheme. See the block comment on `--m3-on-background` in
 * src/app.css before renaming or re-valuing this.
 */
const STAGE_SURFACE = '#281715';
const SYSTEM_ALERT = '#410001';
const SYSTEM_ERROR = '#b1005e';
const DARK_TEXT = '#141c25';
const ADMIN_TABLE_TOKENS = {
    '--admin-workspace-background': '#e4e2e2',
    '--admin-search-surface': '#fcf9f9',
    '--admin-search-text': '#444748',
    '--admin-search-placeholder': '#444748',
    '--admin-search-icon': '#444748',
    '--admin-search-hover-surface': '#f0edee',
    '--admin-table-surface': '#f6f3f3',
    '--admin-table-header-surface': '#e4e2e2',
    '--admin-table-row-hover-surface': '#f0edee',
    '--admin-table-footer-surface': '#e4e2e2',
    '--admin-table-border': '#eae7e8',
    '--admin-table-text': '#444748',
    '--admin-table-header-text': '#1b1b1c',
    '--admin-table-chip-surface': '#e4e2e2',
    '--admin-table-chip-border': '#c4c7c8',
    '--admin-table-chip-text': '#444748',
    '--admin-form-field-surface': '#fcf9f9',
    '--admin-form-card-surface': '#eae7e8',
    '--admin-form-label-text': '#444748',
};

/**
 * Field anatomy tokens (#313): form-field surfaces sit one step LIGHTER than
 * `--admin-workspace-background` (#e4e2e2, surface-container-highest tier) so
 * inputs read as raised instead of muddy, with a subtle outline-variant border.
 * Selection is an "illuminated" light primary-container tonal derived from the
 * tenant seed. `--admin-form-field-surface` above is the legacy alias consumed
 * by `--input-bg`/`--input-label-bg` and must never drift from
 * `--admin-field-surface`.
 */
const adminFieldTokens = (accentLight: string, onAccentLightVariant: string) => ({
    '--admin-field-surface': '#fcf9f9',
    '--admin-field-outline': '#c4c7c8',
    '--admin-field-surface-hover': '#f6f3f3',
    '--admin-field-selected-surface': accentLight,
    '--admin-field-selected-text': onAccentLightVariant,
});

const defaultAccentTokens = (accentDark: string, explicitAccentLight?: string) => {
    if (!explicitAccentLight && accentDark === DEFAULT_ACCENT_DARK) {
        return {
            accentLight: DEFAULT_ACCENT_LIGHT,
            accentDim: DEFAULT_ACCENT_DIM,
            accentAction: DEFAULT_ACCENT_ACTION,
            onAccentLightVariant: '#930008',
            navIndicator: DEFAULT_NAV_INDICATOR,
        };
    }

    const accentLight = explicitAccentLight ?? mix(accentDark, '#ffffff', 0.84);

    return {
        accentLight,
        accentDim: mix(accentLight, accentDark, 0.16),
        accentAction: accentDark,
        onAccentLightVariant: mix(accentDark, '#000000', 0.12),
        // 0.6 towards black lands #a5000a on #420004 — i.e. the same tone the
        // default seed pins to DEFAULT_NAV_INDICATOR, so custom seeds stay in
        // the same depth register as Figma.
        navIndicator: mix(accentDark, '#000000', 0.6),
    };
};

const readableOn = (background: string) =>
    contrastRatio(DARK_TEXT, background) >= contrastRatio('#ffffff', background) ? DARK_TEXT : '#ffffff';

/**
 * Mobile bottom-navigation active indicator (Figma 56576:34607): the deep brand
 * red 56×32 pill behind the selected destination's icon. It is a SURFACE, so
 * the icon on top is {@link readableOn} of it — never the other way round. Kept
 * as its own `--admin-*` pair instead of borrowing an M3 `on-*` role name,
 * because the M3 nav bar normally uses `secondary-container` here and ORISO
 * deliberately deviates. Static fallbacks live in src/app.css.
 */
const adminNavTokens = (navIndicator: string) => ({
    '--admin-nav-indicator-surface': navIndicator,
    '--admin-nav-indicator-icon': readableOn(navIndicator),
});

const invertedTokens = (accentDark: string, accentLight: string, accentDim: string, onAccentLightVariant: string) => {
    const primary = accentLight;
    const primaryContainer = accentDark;
    const action = mix(accentLight, '#ffffff', 0.1);

    return {
        ...ADMIN_TABLE_TOKENS,
        ...adminFieldTokens(accentLight, onAccentLightVariant),
        // Inverted scheme flips the indicator to the LIGHT accent: the deep red
        // pill of the light scheme would vanish against the dark surface.
        ...adminNavTokens(accentLight),
        '--m3-primary': primary,
        '--m3-on-primary': readableOn(primary),
        '--m3-primary-container': primaryContainer,
        '--m3-on-primary-container': readableOn(primaryContainer),
        '--m3-primary-fixed': accentLight,
        '--m3-primary-fixed-dim': accentDim,
        '--m3-on-primary-fixed-variant': onAccentLightVariant,
        '--m3-secondary': '#cbd6e2',
        '--m3-on-secondary': DARK_TEXT,
        '--m3-secondary-container': '#39414b',
        '--m3-on-secondary-container': '#e7effc',
        '--m3-error': '#ffb1c8',
        '--m3-on-error': '#41001f',
        '--m3-error-container': '#8a0049',
        '--m3-on-error-container': '#ffd9e5',
        '--m3-warning': '#ffb4ab',
        '--m3-on-warning': SYSTEM_ALERT,
        '--m3-surface': '#303030',
        '--m3-on-surface': '#f4eff0',
        '--m3-surface-container-lowest': '#252324',
        '--m3-surface-container-low': '#383637',
        '--m3-surface-container': '#3d3b3c',
        '--m3-surface-container-high': '#474545',
        '--m3-surface-container-highest': '#514f50',
        '--m3-on-surface-variant': '#d0c4c7',
        '--m3-surface-variant': '#494647',
        '--m3-outline': '#9a9295',
        '--m3-outline-variant': '#4d484a',
        '--m3-background': '#303030',
        '--m3-on-background': STAGE_SURFACE,
        '--m3-inverse-surface': '#fcf9f9',
        '--m3-inverse-on-surface': '#1a1c1e',
        '--oriso-app-accent': primary,
        '--oriso-app-accent-dark': accentDark,
        '--oriso-app-accent-light': accentLight,
        '--oriso-app-on-accent': readableOn(primary),
        '--oriso-app-accent-container': primaryContainer,
        '--oriso-app-chat-surface': '#ffffff',
        '--oriso-app-action': action,
        '--oriso-app-on-action': readableOn(action),
    };
};

export const computeOrisoPalette = (seeds: TenantSeeds, scheme: OrisoSchemeName = 'light'): OrisoPaletteResult => {
    const accentDark = normalizeHex(getAccentDark(seeds)) ?? DEFAULT_ACCENT_DARK;
    const explicitAccentLight = normalizeHex(getAccentLight(seeds));
    const { accentLight, accentDim, accentAction, onAccentLightVariant, navIndicator } = defaultAccentTokens(
        accentDark,
        explicitAccentLight,
    );
    const onAccentDark = readableOn(accentDark);
    const onAccentLight = readableOn(accentLight);
    const onAccentAction = readableOn(accentAction);
    const tooPale = saturation(accentDark) < 0.12;

    if (scheme === 'inverted') {
        return {
            tooPale,
            tokens: invertedTokens(accentDark, accentLight, accentDim, onAccentLightVariant),
        };
    }

    return {
        tooPale,
        tokens: {
            ...ADMIN_TABLE_TOKENS,
            ...adminFieldTokens(accentLight, onAccentLightVariant),
            ...adminNavTokens(navIndicator),
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
            '--m3-on-background': STAGE_SURFACE,
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
