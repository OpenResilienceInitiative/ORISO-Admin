import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const agencyEditSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

// ORISO-Admin#1309: the three legal editors on the agency "Rechtliches" tab get the whole row,
// the two short tiles keep one column. The tab lists its tiles in one array (`legalTiles`).
describe('Agency Edit legal raster', () => {
    const list = agencyEditSource.match(/const legalTiles: AgencyTile\[\] = \[([\s\S]*?)\n {8}\];/)?.[1] ?? '';
    const items = list
        .split(/\n {12}\{\n/)
        .slice(1)
        .map((entry) => entry.split(/\n {12}\},?$/m)[0]);
    const findItem = (content: string) => items.find((body) => body.includes(content));

    it('gives DPA, imprint and privacy the whole row', () => {
        expect(findItem('<DataProcessingAgreementContainer')).toContain('span: 3');
        expect(findItem('field="imprint"')).toContain('span: 3');
        expect(findItem('field="privacy"')).toContain('span: 3');
    });

    it('keeps the short tiles in one column', () => {
        const responsible = findItem('<ResponsibleSettings');
        const contact = findItem('<ContactSettings');
        expect(responsible).toBeDefined();
        expect(contact).toBeDefined();
        expect(responsible).not.toContain('span:');
        expect(contact).not.toContain('span:');
    });
});
