import { describe, expect, it } from 'vitest';
import html from './fixtures/notification-no-cta-de.html?raw';
import text from './fixtures/notification-no-cta-de.txt?raw';

/*
 * The `CallToActionAbsent` story shows what a mail without an action looks like (the DPA-signed
 * notice is one). Such a mail has no link to keep secret and is no invitation, so the frame must
 * not say either. The fixture is verbatim backend output: a stale regeneration fails here.
 */
describe('no-action notification fixture', () => {
    it.each([
        ['html', html],
        ['text', text],
    ])('%s part names neither a link nor an invitation', (_part, mail) => {
        expect(mail).not.toContain('Geben Sie diesen Link an niemanden weiter');
        expect(mail).not.toContain('Diese E-Mail gehört zu Ihrer Einladung');
        expect(mail).toContain('Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht darauf.');
    });

    it('keeps no orphan divider in the text part', () => {
        expect(text).not.toMatch(/^-{64}$/m);
    });
});
