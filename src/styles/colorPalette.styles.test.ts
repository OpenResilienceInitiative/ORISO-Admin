import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import less from 'less';
import { describe, expect, it } from 'vitest';

/*
 * Owner report (2026-09-19): "generell ist da ein kontrast wirrwarr".
 *
 * The app carries TWO Less palettes, both pulled into the same scope by
 * src/styles/App.less:
 *
 *     @import 'variables/index.less';   // -> variables/_colors.less
 *     @import 'components/index.less';  // the styles that CONSUME the names
 *     @import './Settings.less';        // the legacy palette
 *
 * Less resolves a variable to its LAST definition in the scope, regardless of
 * where it is used. So every component style, although imported on line 6,
 * silently gets the values Settings.less assigns on line 8. Where the two
 * palettes happen to agree that is invisible. Where they disagree, the file
 * that reads best in review is not the file that renders.
 *
 * `@light-grey` was the case that disagreed: a near-white SURFACE (#f5f3f6) in
 * variables/_colors.less, a mid-grey FOREGROUND (#787378) in Settings.less.
 * The name describes the shade, not the job, which is why nothing about
 * `background: @light-grey` in loginForm.less looked wrong.
 *
 * These tests compile App.less with the options vite uses (see vite.config.ts:
 * css.preprocessorOptions.less) and assert on the rendered result, not on the
 * source text — the whole point is that the source text is not what renders.
 */

const stylesDir = resolve(__dirname);
const read = (file: string) => readFileSync(resolve(stylesDir, file), 'utf8');

const renderApp = async () => {
    const output = await less.render(read('App.less'), {
        filename: resolve(stylesDir, 'App.less'),
        paths: [stylesDir],
        javascriptEnabled: true,
    });

    return output.css;
};

const channel = (value: number) => {
    const c = value / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const toRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;

    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};

const luminance = (hex: string) => {
    const [r, g, b] = toRgb(hex);

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (foreground: string, background: string) => {
    const a = luminance(foreground);
    const b = luminance(background);

    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const declarationFor = (css: string, selector: string, property: string) => {
    const block = css.split('}').find((rule) => rule.includes(selector));
    const match = block?.match(new RegExp(`${property}:\\s*([^;\\n]+)`));

    return match?.[1].trim();
};

describe('login language selector contrast', () => {
    /*
     * The option label is 16px/700. Bold only counts as "large text" from
     * 18.66px, so WCAG 2.2 SC 1.4.3 asks for 4.5:1 here, not 3:1. This is the
     * language switcher on the login screen — the control a user reaches for
     * when the interface is not in a language they read.
     */
    it('keeps the hovered option readable', async () => {
        const css = await renderApp();

        const text = declarationFor(css, '.loginLanguageSelectorDropdown .ant-select-item-option-content', 'color');
        const hover = declarationFor(
            css,
            '.loginLanguageSelectorDropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled)',
            'background',
        );

        expect(text).toBeDefined();
        expect(hover).toBeDefined();
        expect(contrastRatio(text as string, hover as string)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps the selected option readable', async () => {
        const css = await renderApp();

        const selected = declarationFor(
            css,
            '.loginLanguageSelectorDropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled)',
            'background',
        );

        expect(selected).toBeDefined();
        expect(contrastRatio('#ffffff', selected as string)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('the two Less palettes', () => {
    /*
     * The guard, not the symptom. A name defined in both files renders as the
     * Settings.less value whatever variables/_colors.less says, so a name may
     * only live in both places while both agree. Adding a colliding name is
     * how this defect returns; this is the test that stops it.
     *
     * A failure here is NOT fixed by editing the expectation. Rename the entry
     * in variables/_colors.less after what it is FOR (a surface, a border, a
     * disabled label) and repoint its consumers.
     */
    it('define no colour name twice with different values', () => {
        const declarations = (file: string) =>
            new Map(
                read(file)
                    .split('\n')
                    .map((line) => line.match(/^@([\w-]+):\s*(.+?);\s*$/))
                    .filter((match): match is RegExpMatchArray => match !== null)
                    .map(([, name, value]): [string, string] => [
                        name,
                        value
                            .trim()
                            .toLowerCase()
                            .replace(/^#fff$/, '#ffffff'),
                    ]),
            );

        const scoped = declarations('variables/_colors.less');
        const legacy = declarations('Settings.less');

        const conflicting = [...scoped]
            .filter(([name, value]) => legacy.has(name) && legacy.get(name) !== value)
            .map(([name, value]) => `@${name}: ${value} vs ${legacy.get(name)}`);

        expect(conflicting).toEqual([]);
    });
});
