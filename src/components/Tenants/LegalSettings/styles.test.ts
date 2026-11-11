import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const legalSettingsSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

// ORISO-Admin#1309: every legal tile takes the whole row. The editors need the width, and the
// tile with the delegation switch lines up with them.
describe('LegalSettings raster', () => {
    it('gives every legal tile the whole row', () => {
        const items = [...legalSettingsSource.matchAll(/<CardGrid\.Item([^>]*)>/g)];

        expect(items.length).toBeGreaterThanOrEqual(4);
        items.forEach(([, props]) => expect(props).toContain('span={3}'));
    });
});
