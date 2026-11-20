import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const source = readFileSync(resolve(__dirname, './NavIcon.tsx'), 'utf8');

/**
 * ORISO-Admin#678: no nav item passes `routePathNames.globalSettings`, so the
 * switch branch was unreachable and read as a second settings entry.
 */
describe('NavIcon retired global-settings path (ORISO-Admin#678)', () => {
    it('has no case for routePathNames.globalSettings', () => {
        expect(source).not.toMatch(/case routePathNames\.globalSettings:/);
    });

    it('still maps the live settings nav path to the display-settings icons', () => {
        expect(source).toMatch(/case routePathNames\.themeSettings:/);
    });
});

/** #1374: the invite area is about sending mail, so its nav item shows an envelope, not a chain link. */
describe('NavIcon invite glyph (ORISO-Admin#1374)', () => {
    const glyphSource = readFileSync(resolve(__dirname, '../NavGlyph/index.tsx'), 'utf8');

    it('maps the invite routes to the envelope icons, not the retired chain-link set', () => {
        expect(source).toMatch(/navbar\/invite_active\.svg/);
        expect(source).not.toMatch(/navbar\/links_(active|hover|inactive)\.svg/);
    });

    it('draws the links nav glyph as the envelope', () => {
        expect(glyphSource).toMatch(/links: InviteGlyph/);
        expect(glyphSource).not.toMatch(/nav-glyphs\/links\.svg/);
    });
});
