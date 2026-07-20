import { theme as antdTheme } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAdminAntdTheme } from './antdM3Theme';
import { computeOrisoPalette } from '../utils/theme/orisoScheme';

// The bridge must stay a pure derivation of the OrisoScheme palette. To test the
// fallback path (palette missing a token) the module is wrapped so single tests
// can override the returned token set while all others use the real palette.
const mocks = vi.hoisted(() => ({
    tokensOverride: null as Record<string, string> | null,
}));

vi.mock('../utils/theme/orisoScheme', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/theme/orisoScheme')>();
    return {
        ...actual,
        computeOrisoPalette: (...args: Parameters<typeof actual.computeOrisoPalette>) =>
            mocks.tokensOverride
                ? { tokens: mocks.tokensOverride, tooPale: false }
                : actual.computeOrisoPalette(...args),
    };
});

describe('buildAdminAntdTheme', () => {
    afterEach(() => {
        mocks.tokensOverride = null;
    });

    it('derives the antd colour tokens from the M3 light palette (single source of truth)', () => {
        const { tokens } = computeOrisoPalette({}, 'light');
        const { token, algorithm } = buildAdminAntdTheme();

        expect(algorithm).toBe(antdTheme.defaultAlgorithm);
        // Brand + semantic colours come straight from the --m3-* token set,
        // not from the legacy hard-coded blue (#273270).
        expect(token?.colorPrimary).toBe(tokens['--m3-primary']);
        expect(token?.colorPrimary).toBe('#a5000a');
        expect(token?.colorLink).toBe(tokens['--m3-primary']);
        expect(token?.colorInfo).toBe(tokens['--m3-primary']);
        expect(token?.colorError).toBe(tokens['--m3-error']);
        expect(token?.colorWarning).toBe(tokens['--m3-warning']);
        // Surfaces, text and borders follow the M3 surface roles.
        expect(token?.colorTextBase).toBe(tokens['--m3-on-surface']);
        expect(token?.colorBgBase).toBe(tokens['--m3-surface']);
        expect(token?.colorBgContainer).toBe(tokens['--m3-surface-container-low']);
        expect(token?.colorBgElevated).toBe(tokens['--m3-surface-container']);
        expect(token?.colorBorder).toBe(tokens['--m3-outline-variant']);
        expect(token?.colorBorderSecondary).toBe(tokens['--m3-outline-variant']);
    });

    it('propagates tenant colour seeds into the antd primary colour', () => {
        const { token } = buildAdminAntdTheme({ seeds: { accentDark: '#336699' } });

        expect(token?.colorPrimary).toBe('#336699');
        expect(token?.colorLink).toBe('#336699');
    });

    it('uses the dark algorithm and the inverted palette for the inverted scheme', () => {
        const { tokens } = computeOrisoPalette({}, 'inverted');
        const { token, algorithm } = buildAdminAntdTheme({ scheme: 'inverted' });

        expect(algorithm).toBe(antdTheme.darkAlgorithm);
        expect(token?.colorPrimary).toBe(tokens['--m3-primary']);
        expect(token?.colorBgBase).toBe(tokens['--m3-surface']);
        expect(token?.colorTextBase).toBe(tokens['--m3-on-surface']);
    });

    it('falls back to the baked-in M3 defaults when the palette omits a token', () => {
        mocks.tokensOverride = {};

        const { token } = buildAdminAntdTheme();

        expect(token?.colorPrimary).toBe('#a5000a');
        expect(token?.colorError).toBe('#b1005e');
        expect(token?.colorWarning).toBe('#410001');
        expect(token?.colorTextBase).toBe('#1a1c1e');
        expect(token?.colorBgBase).toBe('#fcf9f9');
        expect(token?.colorBorder).toBe('#c4c7c8');
    });

    it('applies the M3 shape, typography and control sizing regardless of scheme', () => {
        (['light', 'inverted'] as const).forEach((scheme) => {
            const { token } = buildAdminAntdTheme({ scheme });

            expect(token?.borderRadius).toBe(8);
            expect(token?.borderRadiusLG).toBe(16);
            expect(token?.borderRadiusSM).toBe(4);
            // 'Inter Variable' must lead: it's the actual @font-face name (Fonts.less);
            // bare 'Inter' isn't a loaded face and silently falls back to the system font.
            expect(token?.fontFamily).toMatch(/^'Inter Variable', 'Inter', 'Roboto'/);
            expect(token?.fontSize).toBe(14);
            // 40px control height = WCAG 2.2 target-size headroom.
            expect(token?.controlHeight).toBe(40);
        });
    });
});
