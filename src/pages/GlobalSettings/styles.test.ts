import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const pageSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');
const translationStyles = readFileSync(
    resolve(__dirname, '../../components/GlobalSettings/TranslationApiKeysCard/styles.module.scss'),
    'utf8',
);
const compact = (source: string) => source.replace(/\s+/g, ' ');

describe('Global Settings composition', () => {
    it('stacks the compact cards independently beside Document Master Data on desktop', () => {
        const css = compact(pageStyles);

        expect(pageSource).toContain('<div className={styles.compactCardColumn}>');
        expect(css).toContain("grid-template-areas: 'compact document'");
        expect(css).toContain('grid-template-columns: minmax(360px, 400px) minmax(520px, 740px);');
        expect(css).toMatch(/\.compactCardColumn\s*{[^}]*display:\s*grid;/);
        expect(css).toMatch(/\.compactCardColumn\s*{[^}]*grid-area:\s*compact;/);
        expect(css).toMatch(/\.documentMasterDataCardSlot\s*{[^}]*grid-area:\s*document;/);
        expect(css).not.toContain('grid-column: 1 / -1');
    });

    it('uses the canonical centered Card header instead of local alignment overrides', () => {
        expect(pageStyles).not.toContain("[class*='cardTitle']");
        expect(translationStyles).not.toContain('dialogCardTitle');
        expect(translationStyles).not.toContain('dialogTitleContainer');
    });

    it('keeps provider metadata compact while preserving a full-width API key field', () => {
        const css = compact(translationStyles);

        expect(css).toContain('.provider { display: grid;');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto;');
        expect(css).toMatch(/\.provider > :global\(\.MuiFormControl-root\)\s*{[^}]*grid-column:\s*1 \/ -1;/);
        expect(css).toMatch(/\.provider :global\(button\)\s*{[^}]*grid-column:\s*1 \/ -1;/);
        expect(css).toMatch(/\.provider :global\(button\)\s*{[^}]*justify-self:\s*start;/);
    });
});
