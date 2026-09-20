import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import less from 'less';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../utils/contrastRatio';

// Both Less palettes land in one scope via App.less, and Less takes the LAST
// definition: a name defined in Settings.less wins over variables/_colors.less
// wherever it is used. These tests assert on the COMPILED css, not the source.
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
