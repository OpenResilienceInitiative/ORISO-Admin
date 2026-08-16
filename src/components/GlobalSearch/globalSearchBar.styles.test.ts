import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const barStyles = readFileSync(resolve(__dirname, './globalSearchBar.module.scss'), 'utf8');
const composerStyles = readFileSync(resolve(__dirname, '../../pages/Links/inviteComposer.module.scss'), 'utf8');

const rule = (source: string, selector: string) =>
    source.match(new RegExp(`\\${selector}\\s*{([^}]*)}`, 's'))?.[1] ?? '';

/*
 * ORISO-Admin#713. Measured against Pre-Dev with Playwright as super-admin: the
 * tenant-invite composer's row demanded 1781px of content while the page gave it
 * 1336px at a 1600px viewport (1176px at 1440px, 1016px at 1280px). `width:
 * max-content` on a non-wrapping flex row is what turned "too many controls" into
 * "the send button lives at x=1718 and nobody can reach it" — the row grew to fit
 * its widest possible line and let `.scroller` clip the rest.
 *
 * The contract is therefore: the row wraps to the width it is given. Wide TABLE
 * content may still scroll inside its own container; a primary action may not.
 */
describe('GlobalSearchBar row overflow contract (#713)', () => {
    it('wraps the toolbar row instead of growing to max-content', () => {
        const row = rule(barStyles, '.row');
        expect(row).toMatch(/flex-wrap:\s*wrap;/);
        expect(row).not.toMatch(/width:\s*max-content;/);
    });

    it('keeps the pill (bottom-bar) variant on a single line', () => {
        // The bottom bar is one control plus a 48px overflow slot — wrapping it
        // would push the "Mehr" button onto a second line inside a fixed-height bar.
        expect(rule(barStyles, '.pillRow')).toMatch(/flex-wrap:\s*nowrap;/);
    });

    it('lets the composer fields shrink below their nominal width', () => {
        // 304px + 2x210px of unshrinkable fields is wider than a 390px phone.
        ['.emailField', '.nameField'].forEach((selector) => {
            const field = rule(composerStyles, selector);
            expect(field).toMatch(/max-width:\s*100%;/);
            expect(field).not.toMatch(/flex:\s*0 0 auto;/);
        });
    });
});
