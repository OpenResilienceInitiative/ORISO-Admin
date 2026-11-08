import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const agencyEditSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

// ORISO-Admin#1309: the three legal editors on the agency "Rechtliches" tab get the whole row,
// the two short tiles keep one column.
describe('Agency Edit legal raster', () => {
    const items = [...agencyEditSource.matchAll(/<CardGrid\.Item([^>]*)>([\s\S]*?)<\/CardGrid\.Item>/g)];
    const findItem = (content: string) => items.find(([, , body]) => body.includes(content));

    it('gives DPA, imprint and privacy the whole row', () => {
        expect(findItem('<DataProcessingAgreementContainer')?.[1]).toContain('span={3}');
        expect(findItem('field="imprint"')?.[1]).toContain('span={3}');
        expect(findItem('field="privacy"')?.[1]).toContain('span={3}');
    });

    it('keeps the short tiles in one column', () => {
        const responsible = findItem('<ResponsibleSettings');
        const contact = findItem('<ContactSettings');
        expect(responsible).toBeDefined();
        expect(contact).toBeDefined();
        expect(responsible?.[1]).not.toContain('span');
        expect(contact?.[1]).not.toContain('span');
    });
});
