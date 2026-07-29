import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeOrisoPalette } from './orisoScheme';

const appCss = readFileSync(resolve(__dirname, '../../app.css'), 'utf8');
const protectedLayout = readFileSync(resolve(__dirname, '../../styles/components/protectedLayout.less'), 'utf8');
const stage = readFileSync(resolve(__dirname, '../../styles/components/stage.less'), 'utf8');

const staticToken = (name: string): string | undefined =>
    appCss.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'))?.[1]?.trim();

const srgb = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string) => {
    const value = hex.trim().replace('#', '');
    const [r, g, b] = [0, 2, 4].map((offset) => srgb(parseInt(value.slice(offset, offset + 2), 16)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: string, b: string) => {
    const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
};

const DEFAULT_SEED = { accentDark: '#a5000a', primary: '#a5000a' };

/**
 * Token groundwork for the shared dark stage surface and the rose active pill
 * (#594.13a / #594.13b).
 *
 * Figma wins on the VALUES: the dark panel is `#281715` and the active pill is
 * `#FFE2DE`. It does not win on the ROLE names — Figma calls the rose
 * `M3/sys/light/on-primary-container` only because that style was applied as
 * the pill's fill, while in this codebase `on-*` is the readable FOREGROUND
 * computed by `readableOn()`. The rose therefore lands on `primary-container`
 * and the contrast guard stays intact; that is what the last case pins down.
 */
describe('shared stage-surface and active-pill tokens', () => {
    it('defines the Figma dark stage colour as a named token', () => {
        expect(staticToken('--m3-on-background')).toBe('#281715');
    });

    it('documents that this palette uses M3 system names inverted', () => {
        const note = appCss.slice(0, appCss.indexOf('--m3-on-background:'));
        expect(note).toMatch(/INVERTED/i);
    });

    it('leaves no component hardcoding the dark stage colour', () => {
        expect(protectedLayout).not.toMatch(/background-color:\s*#281715/i);
        expect(protectedLayout).toMatch(/background-color:\s*var\(--m3-on-background/);
    });

    it('resolves the sidebar and the public stage panel to the SAME token', () => {
        expect(stage).toMatch(/background-color:\s*var\(--m3-on-background/);
    });

    it('keeps the token seed-independent in every computed scheme', () => {
        expect(computeOrisoPalette(DEFAULT_SEED, 'light').tokens['--m3-on-background']).toBe('#281715');
        expect(computeOrisoPalette(DEFAULT_SEED, 'inverted').tokens['--m3-on-background']).toBe('#281715');
        expect(
            computeOrisoPalette({ accentDark: '#1c6b3a', primary: '#1c6b3a' }, 'light').tokens['--m3-on-background'],
        ).toBe('#281715');
    });

    it('puts the Figma rose on the primary-container SURFACE, statically and computed', () => {
        expect(staticToken('--m3-primary-container')).toBe('#ffe2de');
        expect(computeOrisoPalette(DEFAULT_SEED, 'light').tokens['--m3-primary-container']).toBe('#ffe2de');
    });

    it('never puts the rose on the on-* foreground, so nothing renders rose on rose', () => {
        const onContainer = staticToken('--m3-on-primary-container') ?? '';
        const computed = computeOrisoPalette(DEFAULT_SEED, 'light').tokens;

        expect(onContainer.toLowerCase()).not.toBe('#ffe2de');
        expect(contrastRatio('#ffe2de', onContainer)).toBeGreaterThanOrEqual(4.5);
        expect(
            contrastRatio(computed['--m3-primary-container'], computed['--m3-on-primary-container']),
        ).toBeGreaterThanOrEqual(4.5);
    });
});
