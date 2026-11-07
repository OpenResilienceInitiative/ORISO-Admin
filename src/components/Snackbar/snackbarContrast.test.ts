import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { contrastRatio } from '../../utils/contrastRatio';
import { computeOrisoPalette, type OrisoSchemeName } from '../../utils/theme/orisoScheme';

/**
 * The snackbar paints four tones from M3 tokens. The static values live in app.css; the scheme
 * (light or inverted) and the tenant seed override some of them at runtime. Resolve both the way the
 * browser would, then check every pair the snackbar uses: text 4.5:1, focus ring and icons 3:1.
 */
const css = readFileSync(join(process.cwd(), 'src/app.css'), 'utf8');
const statics: Record<string, string> = {};
Array.from(css.matchAll(/(--m3-[a-z0-9-]+):\s*([^;]+);/g)).forEach(([, name, value]) => {
    statics[name] ??= value.trim();
});

const resolve = (tokens: Record<string, string>, name: string): string => {
    const value = tokens[name] ?? statics[name];
    const alias = /^var\((--[a-z0-9-]+)\)$/.exec(value ?? '');
    return alias ? resolve(tokens, alias[1]) : value;
};

const TONES = {
    neutral: { container: '--m3-inverse-surface', text: '--m3-inverse-on-surface', action: '--m3-inverse-primary' },
    success: { container: '--m3-success-container', text: '--m3-on-success-container', action: '--m3-success-action' },
    warning: { container: '--m3-warning-container', text: '--m3-on-warning-container', action: '--m3-warning-action' },
    error: { container: '--m3-error', text: '--m3-on-error', action: '--m3-on-error' },
} as const;

const SEEDS = ['#a5000a', '#ffe066', '#a8e6a1', '#9ec9ff', '#ff9f43', '#004e8c'];

describe.each<OrisoSchemeName>(['light', 'inverted'])('snackbar tones in the %s scheme', (scheme) => {
    describe.each(SEEDS)('seed %s', (accentDark) => {
        const { tokens } = computeOrisoPalette({ accentDark }, scheme);
        it.each(Object.entries(TONES))('%s: text, action and focus ring are readable', (_tone, pair) => {
            const container = resolve(tokens, pair.container);
            const text = resolve(tokens, pair.text);
            const action = resolve(tokens, pair.action);
            expect(contrastRatio(text, container)).toBeGreaterThanOrEqual(4.5);
            // The focus ring is the text colour (see Snackbar.module.scss): at least 3:1 on the container.
            expect(contrastRatio(text, container)).toBeGreaterThanOrEqual(3);
            expect(contrastRatio(action, container)).toBeGreaterThanOrEqual(4.5);
        });
    });
});
