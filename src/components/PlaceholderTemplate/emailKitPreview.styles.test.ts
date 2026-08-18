import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const previewStyles = readFileSync(resolve(__dirname, './EmailKitPreview.module.scss'), 'utf8');

const rule = (source: string, selector: string) =>
    source.match(new RegExp(`\\${selector}\\s*{([^}]*)}`, 's'))?.[1] ?? '';

/*
 * E1 — „Nutze hier ruhig schon primary color". The BETREFF caption above the
 * rendered mail is the one piece of the preview that belongs to the Admin
 * chrome rather than to the mail document, so it may carry the tenant primary.
 * Asserted against the stylesheet because CSS modules are proxied in vitest and
 * a rendered colour cannot be read back.
 */
describe('EmailKitPreview colours', () => {
    it('paints the subject caption in the tenant primary', () => {
        expect(rule(previewStyles, '.metaLabel')).toMatch(/color:\s*var\(--m3-primary/);
    });

    it('keeps the caption a caption — primary is a colour here, not a heading size', () => {
        const meta = rule(previewStyles, '.metaLabel');
        expect(meta).toMatch(/font-size:\s*12px;/);
        expect(meta).toMatch(/text-transform:\s*uppercase;/);
    });
});
