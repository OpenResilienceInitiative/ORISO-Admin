// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ADMIN_SEED, applyAdminInvertedTheme, clearAdminInvertedThemeTokens } from './applyAdminTheme';
import { computeOrisoPalette } from './theme/orisoScheme';

const BENCHMARK_SEED = '#a5000a';

const wcagRatio = (hexA: string, hexB: string): number => {
    const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => {
        const n = parseInt(hex.slice(1), 16);
        // eslint-disable-next-line no-bitwise
        return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    };
    const a = luminance(hexA);
    const b = luminance(hexB);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe('applyAdminInvertedTheme', () => {
    it('overrides the --m3-* tokens with the inverted theme output', () => {
        const root = document.createElement('div');
        const applied = applyAdminInvertedTheme({ primaryColor: BENCHMARK_SEED }, root);
        const { tokens } = computeOrisoPalette({ accentDark: BENCHMARK_SEED }, 'inverted');

        expect(applied).toBe(true);
        Object.entries(tokens)
            .filter(([name]) => name.startsWith('--m3-'))
            .forEach(([name, value]) => {
                expect(root.style.getPropertyValue(name), name).toBe(value);
            });
        expect(root.style.getPropertyValue('--m3-surface')).not.toBe('#fcf9f9');
    });

    it('uses the same stored seeds without writing a separate admin palette', () => {
        const root = document.createElement('div');
        applyAdminInvertedTheme({ primaryColor: BENCHMARK_SEED, accent: '#646d78' }, root);
        const { tokens } = computeOrisoPalette({ accentDark: BENCHMARK_SEED, accentLight: '#646d78' }, 'inverted');

        expect(root.style.getPropertyValue('--m3-primary')).toBe(tokens['--m3-primary']);
        expect(root.style.getPropertyValue('--m3-primary-container')).toBe(tokens['--m3-primary-container']);
    });

    it('uses the benchmark admin seed when the tenant has no stored seed', () => {
        const root = document.createElement('div');
        const applied = applyAdminInvertedTheme({}, root);
        const { tokens } = computeOrisoPalette({ accentDark: DEFAULT_ADMIN_SEED }, 'inverted');

        expect(applied).toBe(true);
        expect(root.style.getPropertyValue('--m3-surface')).toBe(tokens['--m3-surface']);
    });

    it('writes stable light admin workspace tokens alongside the inverted shell tokens', () => {
        const root = document.createElement('div');
        const applied = applyAdminInvertedTheme({ primaryColor: BENCHMARK_SEED }, root);
        const { tokens } = computeOrisoPalette({ accentDark: BENCHMARK_SEED }, 'inverted');

        expect(applied).toBe(true);
        expect(root.style.getPropertyValue('--m3-surface')).toBe(tokens['--m3-surface']);
        expect(root.style.getPropertyValue('--admin-workspace-background')).toBe('#e4e2e2');
        expect(root.style.getPropertyValue('--admin-search-surface')).toBe('#fcf9f9');
        expect(root.style.getPropertyValue('--admin-search-text')).toBe('#444748');
        expect(root.style.getPropertyValue('--admin-table-surface')).toBe('#f6f3f3');
        expect(root.style.getPropertyValue('--admin-table-header-surface')).toBe('#e4e2e2');
        expect(root.style.getPropertyValue('--admin-table-text')).toBe('#444748');
        expect(root.style.getPropertyValue('--admin-form-field-surface')).toBe('#f6f3f3');
        expect(root.style.getPropertyValue('--admin-form-card-surface')).toBe('#eae7e8');
        expect(root.style.getPropertyValue('--admin-form-label-text')).toBe('#444748');
    });

    it('ignores an invalid accent seed when the primary seed is valid', () => {
        const root = document.createElement('div');
        const applied = applyAdminInvertedTheme({ primaryColor: BENCHMARK_SEED, accent: 'not-a-hex' }, root);
        const { tokens } = computeOrisoPalette({ accentDark: BENCHMARK_SEED }, 'inverted');

        expect(applied).toBe(true);
        expect(root.style.getPropertyValue('--m3-primary')).toBe(tokens['--m3-primary']);
        expect(root.style.getPropertyValue('--m3-primary-container')).toBe(tokens['--m3-primary-container']);
    });

    it('keeps the static palette on an invalid stored seed', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const root = document.createElement('div');
        const applied = applyAdminInvertedTheme({ primaryColor: 'not-a-hex' }, root);

        expect(applied).toBe(false);
        expect(root.style.length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('clears applied admin tokens from the root element', () => {
        const root = document.createElement('div');
        applyAdminInvertedTheme({ primaryColor: BENCHMARK_SEED }, root);
        expect(root.style.getPropertyValue('--m3-surface')).not.toBe('');

        clearAdminInvertedThemeTokens(root);

        expect(root.style.getPropertyValue('--m3-surface')).toBe('');
        expect(root.style.getPropertyValue('--m3-primary')).toBe('');
        expect(root.style.getPropertyValue('--admin-workspace-background')).toBe('');
        expect(root.style.getPropertyValue('--admin-search-surface')).toBe('');
        expect(root.style.getPropertyValue('--admin-table-surface')).toBe('');
        expect(root.style.getPropertyValue('--admin-form-field-surface')).toBe('');
    });

    it('clears previously applied admin tokens when a later seed is invalid', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const root = document.createElement('div');

        applyAdminInvertedTheme({ primaryColor: BENCHMARK_SEED }, root);
        expect(root.style.getPropertyValue('--m3-surface')).not.toBe('');

        const applied = applyAdminInvertedTheme({ primaryColor: 'not-a-hex' }, root);

        expect(applied).toBe(false);
        expect(root.style.getPropertyValue('--m3-surface')).toBe('');
        expect(root.style.getPropertyValue('--m3-primary')).toBe('');
        warn.mockRestore();
    });

    it.each([
        ['--m3-on-surface', '--m3-surface'],
        ['--m3-on-surface', '--m3-surface-container-lowest'],
        ['--m3-on-surface', '--m3-surface-container-low'],
        ['--m3-on-surface', '--m3-surface-container'],
        ['--m3-on-surface', '--m3-surface-container-high'],
        ['--m3-on-surface', '--m3-surface-container-highest'],
        ['--m3-on-surface-variant', '--m3-surface-variant'],
        ['--m3-on-primary', '--m3-primary'],
        ['--m3-on-primary-container', '--m3-primary-container'],
        ['--m3-on-secondary', '--m3-secondary'],
        ['--m3-on-secondary-container', '--m3-secondary-container'],
        ['--m3-on-error', '--m3-error'],
        ['--m3-on-error-container', '--m3-error-container'],
    ])('%s on %s meets WCAG-AA body contrast', (onRole, surface) => {
        const { tokens } = computeOrisoPalette({ accentDark: BENCHMARK_SEED }, 'inverted');
        const ratio = wcagRatio(tokens[onRole], tokens[surface]);

        expect(
            ratio,
            `${onRole} (${tokens[onRole]}) on ${surface} (${tokens[surface]}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
    });
});
