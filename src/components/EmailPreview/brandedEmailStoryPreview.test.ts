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
        expect(html).toContain('font-size:13px;line-height:20px;">ORISO</div>');
        expect(html).toContain('>Impressum</a>');
        expect(html).toContain('>Datenschutz</a>');
        expect(html).toContain(
            'Diese E-Mail gehört zu Ihrer Einladung und lässt sich nicht abbestellen. Bitte antworten Sie nicht darauf.',
        );
    });

    it('keeps the frame itself — rounded white card, security note inside it, footer below it', () => {
        expect(html).toMatch(/bgcolor="#ffffff"[^>]*border-radius:24px;border:1px solid #e0dada;/);
        expect(html).toContain(
            'Wir fragen Sie nie per E-Mail nach Ihrem Passwort. Geben Sie diesen Link an niemanden weiter.',
        );
        expect(html).toMatch(/<div class="flinks"/);
    });

    /**
     * The sample call-to-action of a DPA_FORWARD render is the counsellor link:
     * `targetRoleFor` sends every kind except TENANT_INVITE down the COUNSELLOR
     * branch, and `InviteAcceptUrlBuilder` points that role at the Admin
     * counsellor onboarding route. A frame whose CTA reads tenant-onboarding or
     * the old app `/account-invite/` route is the wrong fixture.
     */
    it('keeps the counsellor call-to-action shape a DPA_FORWARD preview renders with', () => {
        expect(html).toContain('>Einladung annehmen</a>');
        expect(html).toContain('Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:');
        expect(html).toContain('https://admin.oriso.org/admin/counsellor-onboarding/SAMPLE-PREVIEW-TOKEN');
        expect(html).not.toContain('/admin/tenant-onboarding/');
        expect(html).not.toContain('/account-invite/');
    });
});

describe('branded e-mail story preview — per-mail cells', () => {
    const { html, subject, kind } = renderBrandedEmailStoryPreview(SUBJECT, BODY);

    it('puts this mail’s subject and content into the frame', () => {
        expect(subject).toBe(SUBJECT);
        expect(kind).toBe('DPA_FORWARD');
        expect(html).toContain(`mso-line-height-rule:exactly;">${SUBJECT}</h1>`);
        expect(html).toContain(`<title>${SUBJECT}</title>`);
        expect(html).toContain('<p>Guten Tag Dr. Ruth Recht,</p>');
        // A single newline stays a line break inside one paragraph.
        expect(html).toContain('eingerichtet werden.<br>Bitte prüfen');
    });

    it('drops the fixture’s own sample content — no counsellor invite left behind', () => {
        expect(html).not.toContain('Willkommen im Beratungsteam');
        expect(html).not.toContain('Maren');
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
