import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const protectedLayoutSource = readFileSync(resolve(__dirname, './ProtectedPageLayoutWrapper.tsx'), 'utf8');
const publicLayoutSource = readFileSync(resolve(__dirname, './PublicPageLayoutWrapper.tsx'), 'utf8');

describe('Admin layout footer ownership', () => {
    it('keeps SiteFooter on public pages and out of the authenticated shell', () => {
        expect(publicLayoutSource).toContain("import SiteFooter, { type SiteFooterProps } from './SiteFooter';");
        expect(publicLayoutSource).toMatch(/!hideFooter\s*&&\s*<SiteFooter/);

        expect(protectedLayoutSource).not.toContain("import SiteFooter from './SiteFooter';");
        expect(protectedLayoutSource).not.toMatch(/<SiteFooter\b/);
    });
});
