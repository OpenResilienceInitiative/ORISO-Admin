import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const generalSettingsStyles = readFileSync(resolve(__dirname, './styles.module.scss'), 'utf8');

describe('GeneralSettings appearance card width contract', () => {
    it('uses the standard 392px desktop width for the individual-images card', () => {
        const imagesCardRule = generalSettingsStyles.match(/\.cardSlotImages\s*{([^}]*)}/s)?.[1] ?? '';

        expect(imagesCardRule).toMatch(/--card-deck-item-width:\s*392px/);
    });
});
