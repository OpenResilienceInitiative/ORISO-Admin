import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './EmailTemplatesDialog.module.scss'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);

/*
 * ORISO-Admin#1127 — jsdom does not evaluate CSS: the dialog test proves the kind
 * line is rendered and the columns carry `.hideOnPhone`; these pin what those
 * classes do (also checked in Chromium at 390px in Storybook).
 */
describe('EmailTemplatesDialog phone layout (#1127)', () => {
    const phoneBlock = source.match(/@media \(max-width: 599px\)\s*\{([\s\S]*)\n\}/)?.[1] ?? '';

    it('hides the Kind, Language and Subject columns only below 600px', () => {
        expect(phoneBlock).toMatch(/\.hideOnPhone\s*\{[^{}]*display:\s*none/);
        expect(source.replace(phoneBlock, '')).not.toMatch(/\.hideOnPhone/);
    });

    it('keeps the kind line hidden on wider screens and shows it on phones', () => {
        expect(source).toMatch(/\.kindLine\s*\{[^{}]*display:\s*none/);
        expect(phoneBlock).toMatch(/\.kindLine\s*\{[^{}]*display:\s*block/);
    });
});
