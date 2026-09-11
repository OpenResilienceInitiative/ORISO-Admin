import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
