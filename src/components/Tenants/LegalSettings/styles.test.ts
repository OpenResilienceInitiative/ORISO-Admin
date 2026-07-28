import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const legalSettingsStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

// #568: without a width cap the legal cards inherit their content's
// max-content width (the ~750px editor toolbar) and push the imprint and
// privacy cards off-screen, where nothing marks them as reachable.
describe('LegalSettings card deck contract', () => {
    it('pins the deck item width tokens like the other settings decks', () => {
        expect(legalSettingsStyles).toMatch(/--card-deck-item-width:\s*425px/);
        expect(legalSettingsStyles).toMatch(/--card-deck-item-max-width:\s*425px/);
    });

    it('never lets a deck item grow beyond its token width', () => {
        expect(legalSettingsStyles).not.toMatch(/flex-grow/);
    });
});
