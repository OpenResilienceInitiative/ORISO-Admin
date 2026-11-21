import { computeOrisoPalette, type AdminContrast, type OrisoSchemeName } from './theme/orisoScheme';
import { readSeeds, ThemingSeedFields } from './themeSeeds';
import { contrastRatio } from './contrastRatio';

export const DEFAULT_ADMIN_SEED = '#A5000A';

/** WCAG 2.2 non-text contrast for a focus indicator. */
const FOCUS_RING_MIN_CONTRAST = 3;

/**
 * The dialog card draws its focus ring in the scheme colour (`--m3-primary`, the Träger seed), and a pale
 * seed takes it below 3:1 on the card (#b4ddee: 1.18:1). Keep the Träger colour where it reads, otherwise
 * use the fixed ORISO accent the shared ring uses (#1168).
 */
const cardFocusRing = (tokens: Record<string, string>, fallback: string): string => {
    const ring = tokens['--m3-primary'];
    const surface = tokens['--admin-form-card-surface'];

    return ring && surface && contrastRatio(ring, surface) >= FOCUS_RING_MIN_CONTRAST ? ring : fallback;
};
const ADMIN_THEME_TOKEN_PREFIX = '--m3-';
const ADMIN_SURFACE_TOKEN_PREFIX = '--admin-';

const isAdminRuntimeToken = (name: string) =>
    name.startsWith(ADMIN_THEME_TOKEN_PREFIX) || name.startsWith(ADMIN_SURFACE_TOKEN_PREFIX);

const appliedTokenNames = new WeakMap<HTMLElement, string[]>();

export const clearAdminInvertedThemeTokens = (root: HTMLElement = document.documentElement): void => {
    appliedTokenNames.get(root)?.forEach((name) => root.style.removeProperty(name));
    appliedTokenNames.delete(root);
};

const normalizeSeed = (
    value: string | null | undefined,
    label: string,
    { optional = false }: { optional?: boolean } = {},
): string | undefined => {
    if (!value?.trim()) {
        return undefined;
    }

    const withHash = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
    const expanded =
        withHash.length === 4
            ? `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`
            : withHash;

    if (!/^#[0-9a-f]{6}$/i.test(expanded)) {
        if (optional) {
            return undefined;
        }

        throw new Error(`Admin theming: ${label} seed is not a valid hex colour.`);
    }

    return expanded.toLowerCase();
};

const applyAdminSchemeTheme = (
    theming: ThemingSeedFields | null | undefined,
    scheme: OrisoSchemeName,
    root: HTMLElement,
    contrast: AdminContrast = 'standard',
): boolean => {
    try {
        const seeds = readSeeds(theming);
        // One rule for every scheme and contrast: an invalid stored primary falls back to the ORISO seed, so a
        // dark or high-contrast user still gets the palette they chose instead of the static light defaults.
        const storedPrimary = seeds.primary ?? seeds.accentDark;
        const validPrimary = normalizeSeed(storedPrimary, 'primary', { optional: true });
        const primaryRejected = Boolean(storedPrimary?.trim()) && !validPrimary;
        if (primaryRejected) {
            // eslint-disable-next-line no-console
            console.warn('Admin theming: stored primary seed is not a valid hex colour, using the ORISO seed.');
        }
        const primary = validPrimary ?? DEFAULT_ADMIN_SEED;
        const accent = normalizeSeed(seeds.accent ?? seeds.accentLight, 'accent', { optional: true });
        const { tokens } = computeOrisoPalette(
            {
                accentDark: primary,
                accentLight: accent,
                primary,
                accent,
                signal: contrast === 'standard' ? undefined : seeds.signal,
            },
            scheme,
            contrast,
        );

        // Tokens only the other scheme defines (the inverted snackbar containers) must not stay on the root.
        clearAdminInvertedThemeTokens(root);

        if (scheme !== 'inverted') {
            const fallback = scheme === 'dark' ? tokens['--m3-on-surface'] : DEFAULT_ADMIN_SEED.toLowerCase();
            tokens['--admin-focus-ring-on-surface'] = cardFocusRing(tokens, fallback);
        }

        const entries = Object.entries(tokens).filter(([name]) => isAdminRuntimeToken(name));
        entries.forEach(([name, value]) => root.style.setProperty(name, value));
        appliedTokenNames.set(
            root,
            entries.map(([name]) => name),
        );

        return !primaryRejected;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Admin theming: stored seed is invalid, keeping the static palette.', error);
        clearAdminInvertedThemeTokens(root);
        return false;
    }
};

/**
 * Apply the light admin surface palette (the default admin appearance). Writes
 * the tenant-seeded `--m3-*`/`--admin-*` tokens so the runtime theme matches the
 * light components shown in Storybook.
 */
export const applyAdminTheme = (
    theming: ThemingSeedFields | null | undefined,
    root: HTMLElement = document.documentElement,
    scheme: 'light' | 'dark' = 'light',
    contrast: AdminContrast = 'standard',
): boolean => applyAdminSchemeTheme(theming, scheme, root, contrast);

/**
 * Apply the dark/inverted admin surface palette. Retained for surfaces that opt
 * into the inverted shell (e.g. theme-builder previews).
 */
export const applyAdminInvertedTheme = (
    theming: ThemingSeedFields | null | undefined,
    root: HTMLElement = document.documentElement,
): boolean => applyAdminSchemeTheme(theming, 'inverted', root);
