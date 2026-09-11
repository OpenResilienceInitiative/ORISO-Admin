import { describe, expect, it } from 'vitest';
import deTranslation from '../../locales/de/translation.json';
import enTranslation from '../../locales/en/translation.json';
import { buildForwardMailPreview } from './forwardMailPreview';

const SIGN_URL = 'https://app.example.org/dpa-sign/token-1';

/** A minimal stand-in for i18next's `t` over the REAL shipped copy. */
const translator =
    (locale: Record<string, unknown>) =>
    (key: string, options: Record<string, unknown> = {}) => {
        const template = typeof locale[key] === 'string' ? (locale[key] as string) : key;
        return Object.entries(options).reduce(
            (text, [token, value]) => text.split(`{{${token}}}`).join(String(value)),
            template,
        );
    };

const de = translator(deTranslation as Record<string, unknown>);
const en = translator(enTranslation as Record<string, unknown>);

/** Any `{{token}}` that survived into text a human is about to read. */
const UNRESOLVED_TOKEN = /\{\{|\}\}/;

describe('buildForwardMailPreview', () => {
    it('greets neutrally while no recipient name is given', () => {
        const { body } = buildForwardMailPreview(de, { recipientName: '', signUrl: SIGN_URL });

        // The preview is shown to a person, so it may never leak the raw template.
        expect(body).not.toMatch(UNRESOLVED_TOKEN);
        // …and dropping the name must not leave "Guten Tag ," behind either.
        expect(body).not.toMatch(/[ \t]+,/);
        expect(body).toContain(SIGN_URL);
    });

    it('greets the recipient by name as soon as one is typed', () => {
        const named = buildForwardMailPreview(de, { recipientName: '  Dr. Ruth Recht  ', signUrl: SIGN_URL }).body;
        const neutral = buildForwardMailPreview(de, { recipientName: '', signUrl: SIGN_URL }).body;

        expect(named).toContain('Dr. Ruth Recht');
        expect(named).not.toMatch(UNRESOLVED_TOKEN);
        expect(named).not.toEqual(neutral);
    });

    it('names the pending link instead of printing {{link}} before it exists', () => {
        const { body } = buildForwardMailPreview(de, { recipientName: 'Dr. Ruth Recht', signUrl: null });

        expect(body).not.toMatch(UNRESOLVED_TOKEN);
    });

    it('resolves the same way in English', () => {
        const { subject, body } = buildForwardMailPreview(en, { recipientName: '', signUrl: SIGN_URL });

        expect(subject).not.toMatch(UNRESOLVED_TOKEN);
        expect(body).not.toMatch(UNRESOLVED_TOKEN);
        expect(body).not.toMatch(/[ \t]+,/);
        expect(body).toContain(SIGN_URL);
    });
});
