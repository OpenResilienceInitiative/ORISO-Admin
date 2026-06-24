import { computeOrisoPalette } from './theme/orisoScheme';
import { readSeeds, ThemingSeedFields } from './themeSeeds';

export const DEFAULT_ADMIN_SEED = '#A5000A';
const ADMIN_THEME_TOKEN_PREFIX = '--m3-';

const normalizeSeed = (value: string | null | undefined, label: string): string | undefined => {
    if (!value?.trim()) {
        return undefined;
    }

    const withHash = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
    const expanded =
        withHash.length === 4
            ? `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`
            : withHash;

    if (!/^#[0-9a-f]{6}$/i.test(expanded)) {
        throw new Error(`Admin theming: ${label} seed is not a valid hex colour.`);
    }

    return expanded.toLowerCase();
};

export const applyAdminInvertedTheme = (
    theming: ThemingSeedFields | null | undefined,
    root: HTMLElement = document.documentElement,
): boolean => {
    try {
        const seeds = readSeeds(theming);
        const primary = normalizeSeed(seeds.primary ?? seeds.accentDark, 'primary') ?? DEFAULT_ADMIN_SEED;
        const accent = normalizeSeed(seeds.accent ?? seeds.accentLight, 'accent');
        const { tokens } = computeOrisoPalette(
            {
                accentDark: primary,
                accentLight: accent,
                primary,
                accent,
            },
            'inverted',
        );

        Object.entries(tokens)
            .filter(([name]) => name.startsWith(ADMIN_THEME_TOKEN_PREFIX))
            .forEach(([name, value]) => {
                root.style.setProperty(name, value);
            });

        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Admin theming: stored seed is invalid, keeping the static palette.', error);
        Array.from(root.style)
            .filter((name) => name.startsWith(ADMIN_THEME_TOKEN_PREFIX))
            .forEach((name) => root.style.removeProperty(name));
        return false;
    }
};
