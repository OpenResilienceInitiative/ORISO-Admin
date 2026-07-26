import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const source = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

describe('tenant creation card navigation', () => {
    it('keeps the arrow buttons close to the cards', () => {
        const deck = styles.match(/\.tenantCardDeck\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        const footer = styles.match(/\.tenantCardDeckFooter\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(deck).toMatch(/--card-deck-min-height:\s*0/);
        expect(footer).toMatch(/margin-top:\s*32px/);
        expect(source).toContain('footerClassName={styles.tenantCardDeckFooter}');
    });
});
