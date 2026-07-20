import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

describe('agency creation card widths', () => {
    it('keeps both left-hand creation cards readable on desktop', () => {
        const group = styles.match(/\.createCardGroup\s*{([\s\S]*?)\n}/)?.[1] ?? '';
        expect(group).toMatch(/--card-deck-item-min-width:\s*624px/);
        expect(group).toMatch(/>\s*\*\s*{[\s\S]*?min-width:\s*300px/);
    });

    it('stacks the grouped cards without a desktop minimum on mobile', () => {
        expect(styles).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*?\.createCardGroup[\s\S]*?flex-direction:\s*column/);
        expect(styles).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*?>\s*\*\s*{[\s\S]*?min-width:\s*0/);
    });
});
