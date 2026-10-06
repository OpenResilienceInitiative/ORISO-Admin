import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './inviteProgressBoard.module.scss'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);

/*
 * ORISO-Admin#1127 — jsdom does not evaluate CSS, so the unit test of the filter
 * toggle can only prove the state it reports. These pin the rules that make that
 * state visible on a phone (also checked in Chromium at 390px in Storybook).
 */
describe('InviteProgressBoard phone filter fold (#1127)', () => {
    const phoneBlock = source.match(/@media \(max-width: 767px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    it('shows the toggle only on phones', () => {
        expect(source).toMatch(/\.filterToggle\s*\{[^{}]*display:\s*none/);
        expect(phoneBlock).toMatch(/\.filterToggle\s*\{[^{}]*display:\s*inline-flex/);
    });

    it('hides every chip but the selected one while folded, on phones only', () => {
        expect(phoneBlock).toMatch(
            /\.chips\[data-collapsed='true'\]\s+\.chip:not\(\.chipSelected\)\s*\{[^{}]*display:\s*none/,
        );
        expect(source.replace(phoneBlock, '')).not.toMatch(/data-collapsed/);
    });
});
