import { describe, expect, it } from 'vitest';
import { renderBrandedEmailStoryPreview } from './brandedEmailStoryPreview';

const SUBJECT = 'Auftragsverarbeitungsvertrag: Ihre Unterschrift wird benötigt';
const BODY =
    'Guten Tag Dr. Ruth Recht,\n\nfür Ihre Organisation soll die Plattform eingerichtet werden.\n' +
    'Bitte prüfen und unterzeichnen Sie den Vertrag:\n\nhttps://app.example.org/dpa-sign/token-1\n\n' +
    'Der Link bleibt gültig, bis der Vertrag unterzeichnet ist.';

/*
 * JOB11 — "Add Footer to the forwarded email as well".
 *
 * The forwarded mail must carry the SAME footer the other transactional mails
 * carry, and that footer is owned by ORISO-UserService, not by this repo. These
 * assertions pin that the Storybook stand-in keeps showing the real one: it
 * substitutes only the per-mail cells into a verbatim backend response, so a
 * regression that starts inventing markup (or drops the footer) fails here
 * rather than being noticed on a screenshot.
 */
describe('branded e-mail story preview — the house footer survives verbatim', () => {
    const { html } = renderBrandedEmailStoryPreview(SUBJECT, BODY);

    it('keeps the brand name, the legal pointers and the automated-send note', () => {
        expect(html).toContain('>ORISO</strong>');
        expect(html).toContain('>Impressum</a>');
        expect(html).toContain('>Datenschutz</a>');
        expect(html).toContain('Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht darauf.');
    });

    it('keeps the footer bar itself — surface, top rule and rounded bottom corners', () => {
        expect(html).toMatch(/bgcolor="#f0edee"[^>]*border-top:1px solid #c4c7c8;/);
    });

    /**
     * The sample call-to-action of a DPA_FORWARD render points at the APP host,
     * not the admin console: `targetRoleFor` sends every kind except
     * TENANT_INVITE down the counsellor/app branch. A frame whose CTA suddenly
     * reads `admin.oriso.org` is the wrong fixture.
     */
    it('keeps the app-host call-to-action shape a DPA_FORWARD preview renders with', () => {
        expect(html).toContain('https://app.oriso.org/account-invite/SAMPLE-PREVIEW-TOKEN');
        expect(html).not.toContain('admin.oriso.org');
    });
});

describe('branded e-mail story preview — per-mail cells', () => {
    const { html, subject, kind } = renderBrandedEmailStoryPreview(SUBJECT, BODY);

    it('puts this mail’s subject and content into the frame', () => {
        expect(subject).toBe(SUBJECT);
        expect(kind).toBe('DPA_FORWARD');
        expect(html).toContain(`font-weight:bold;">${SUBJECT}</td>`);
        expect(html).toContain('<p>Guten Tag Dr. Ruth Recht,</p>');
        // A single newline stays a line break inside one paragraph.
        expect(html).toContain('eingerichtet werden.<br>Bitte prüfen');
    });

    it('drops the fixture’s own sample content — no counsellor invite left behind', () => {
        expect(html).not.toContain('Willkommen im Beratungsteam');
        expect(html).not.toContain('Erika');
    });

    it('links the sign link the way the backend does', () => {
        expect(html).toContain(
            '<a href="https://app.example.org/dpa-sign/token-1" target="_blank" rel="noopener noreferrer"',
        );
    });

    it('escapes mail content instead of letting it reach the document as markup', () => {
        const { html: escaped } = renderBrandedEmailStoryPreview('<b>x</b>', 'a & b <script>alert(1)</script>');
        expect(escaped).not.toContain('<script>');
        expect(escaped).toContain('&lt;script&gt;');
        expect(escaped).toContain('a &amp; b');
    });
});
