import { describe, expect, it } from 'vitest';
import type { EmailKitBrand } from './emailKit';
import {
    ADMIN_EMAIL_SAMPLE_BRAND,
    highlightUnknownTokens,
    renderInviteEmailPreviewHtml,
    type InvitePreviewStrings,
} from './invitePreviewMarkup';

const brand: EmailKitBrand = {
    ...ADMIN_EMAIL_SAMPLE_BRAND,
    primaryColor: '#a5000a',
    accentColor: '#a5000a',
};

const strings: InvitePreviewStrings = {
    subjectHint: 'Betreff der E-Mail',
    bodyHint: 'Inhalt der E-Mail',
    assurance: 'Wir fragen Sie nie per E-Mail nach Ihrem Passwort.',
    offeredBy: 'Online-Beratung ist ein Angebot von Caritasverband für die Diözese Mainz e. V.',
    linkLabels: ['Datenschutz', 'Impressum'],
    automatedNote: 'Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht darauf.',
};

const render = (subject: string, body: string) =>
    renderInviteEmailPreviewHtml({ subject, body, brand, strings, lang: 'de' });

describe('renderInviteEmailPreviewHtml', () => {
    it('renders substituted subject and body copy into the kit shell', () => {
        const html = render('Ihre Einladung, Lisa', 'Hallo Lisa Beispiel,\nhier ist Ihr Link.');
        expect(html).toContain('Ihre Einladung, Lisa');
        expect(html).toContain('Hallo Lisa Beispiel,<br>hier ist Ihr Link.');
        // Kit shell: canvas colour, 600px column and the responsive stylesheet.
        expect(html).toContain('background-color:#f2efef');
        expect(html).toContain('max-width:600px');
        expect(html).toContain('@media only screen and (max-width:620px)');
    });

    it('keeps unknown tokens visible as highlighted chips', () => {
        const html = render('Einladung', 'Hallo {{unbekannt}}!');
        expect(html).toContain('{{unbekannt}}');
        expect(html).toContain('data-unknown-token');
        expect(html).toContain('color:#a5000a');
    });

    it('splits blank-line separated text into kit paragraph blocks', () => {
        const html = render('Einladung', 'Absatz eins.\n\nAbsatz zwei.');
        expect(html).toContain('>Absatz eins.</td>');
        expect(html).toContain('>Absatz zwei.</td>');
    });

    it('applies the tenant primary colour to the header logo and accent rule', () => {
        const tenantBrand = { ...brand, primaryColor: '#123456', accentColor: '#123456' };
        const html = renderInviteEmailPreviewHtml({ subject: 'A', body: 'B', brand: tenantBrand, strings, lang: 'de' });
        expect(html).toContain('bgcolor="#123456"');
        expect(html).toContain('background-color:#123456');
    });

    it('renders the muted hints for empty subject and body', () => {
        const html = render('', '');
        expect(html).toContain('Betreff der E-Mail');
        expect(html).toContain('Inhalt der E-Mail');
        expect(html).toContain('<title>Betreff der E-Mail</title>');
        // Muted, not the regular on-surface headline colour.
        expect(html).toContain('color:#5c5555');
    });

    it('renders the footer with sender identity, legal links and the automated note', () => {
        const html = render('Einladung', 'Hallo');
        expect(html).toContain('Caritasverband für die Diözese Mainz e. V.');
        expect(html).toContain('Datenschutz');
        expect(html).toContain('Impressum');
        expect(html).toContain('Bitte antworten Sie nicht darauf.');
        expect(html).toContain(strings.assurance);
    });

    it('escapes user-typed markup instead of executing it', () => {
        const html = render('<b>Betreff</b>', '<script>alert(1)</script>');
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('&lt;b&gt;Betreff&lt;/b&gt;');
    });
});

describe('highlightUnknownTokens', () => {
    it('wraps every remaining token and leaves surrounding text alone', () => {
        const out = highlightUnknownTokens('Hallo {{a}} und {{b}}', brand);
        expect(out.match(/data-unknown-token/g)).toHaveLength(2);
        expect(out).toContain('Hallo ');
    });

    it('falls back to a neutral tint for non-hex theme colours', () => {
        const out = highlightUnknownTokens('{{x}}', { ...brand, primaryColor: 'var(--m3-primary)' });
        expect(out).toContain('background:#f5eded');
    });
});
