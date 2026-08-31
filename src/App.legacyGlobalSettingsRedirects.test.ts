import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './App.tsx'), 'utf8');

/**
 * ORISO-Admin#678: old bookmarks must keep landing on Einstellungen.
 * Assert the route table in App.tsx rather than mounting the whole shell.
 */
describe('legacy /admin/global-settings redirects (ORISO-Admin#678)', () => {
    it('still redirects /admin/global-settings and /login to global-config', () => {
        expect(source).toMatch(/path=\{routePathNames\.globalSettings\}/);
        expect(source).toMatch(/path=\{`\$\{routePathNames\.globalSettings\}\/login`\}/);
        expect(source).toMatch(/to=\{`\$\{routePathNames\.themeSettings\}\/global-config`\}/);
    });

    it('still redirects /admin/global-settings/smtp to the SMTP settings tab', () => {
        expect(source).toMatch(/path=\{`\$\{routePathNames\.globalSettings\}\/smtp`\}/);
        expect(source).toMatch(
            /path=\{`\$\{routePathNames\.globalSettings\}\/smtp`\}[\s\S]*?to=\{`\$\{routePathNames\.themeSettings\}\/smtp`\}/,
        );
    });
});
