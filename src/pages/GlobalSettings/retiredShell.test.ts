import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');

/**
 * ORISO-Admin#678: the old `/admin/global-settings` tab shell is unwired.
 * Login + SMTP pages in this file are still live under Einstellungen.
 */
describe('retired GlobalSettings page shell (ORISO-Admin#678)', () => {
    it('no longer exports GlobalSettingsPage or GlobalSettingsIndexRedirect', () => {
        expect(source).not.toMatch(/export const GlobalSettingsPage\b/);
        expect(source).not.toMatch(/export const GlobalSettingsIndexRedirect\b/);
    });

    it('still exports the live login and SMTP pages used under theme-settings', () => {
        expect(source).toMatch(/export const GlobalLoginSettingsPage\b/);
        expect(source).toMatch(/export const GlobalSmtpSettingsPage\b/);
    });
});
