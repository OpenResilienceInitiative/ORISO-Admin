import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');
const source = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

// Card raster from Figma 1285-80496: the settings dialog card is 360 wide, the
// legal editor panels 800, separated by the shared 48px card gap.
describe('legal settings card raster', () => {
    it('sizes the editor panels to the 800px panel width', () => {
        const deck = styles.match(/\.legalCardDeck\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(deck).toMatch(/--card-deck-item-width:\s*var\(--admin-panel-card-width,\s*800px\)/);
        expect(source).toContain('className={styles.legalCardDeck}');
    });

    it('sizes the toggle card to the 360px dialog width', () => {
        const dialogItem = styles.match(/\.dialogCardItem\s*{([\s\S]*?)\n}/)?.[1] ?? '';

        expect(dialogItem).toMatch(/--admin-dialog-card-width,\s*360px/);
        expect(source).toContain('className={styles.dialogCardItem}');
    });
});
