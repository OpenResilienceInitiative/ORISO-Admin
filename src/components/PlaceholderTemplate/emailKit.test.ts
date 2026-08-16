import { describe, expect, it } from 'vitest';
import {
    emailKitDocument,
    safeEmailColor,
    safeLanguageTag,
    sanitizeEmailKitBrand,
    type EmailKitBrand,
} from './emailKit';

const brand: EmailKitBrand = {
    platformName: 'Online-Beratung',
    orgName: 'Org',
    orgAddress: 'Straße 1',
    contactLine: 'kontakt@example.org',
    primaryColor: '#a5000a',
    accentColor: '#a5000a',
};

describe('safeEmailColor', () => {
    it.each(['#a5000a', '#fff', '#a5000aff', 'rgb(165, 0, 10)', 'rgba(165, 0, 10, 0.5)', 'var(--m3-primary)'])(
        'passes the safe colour grammar through: %s',
        (value) => {
            expect(safeEmailColor(value)).toBe(value);
        },
    );

    it('trims surrounding whitespace from an otherwise safe value', () => {
        expect(safeEmailColor('  #336699  ')).toBe('#336699');
    });

    it.each([
        // Attribute breakout: the quote would close the style="…" it is inlined into.
        '#fff" onmouseover="alert(1)',
        "#fff' onmouseover='alert(1)",
        // Markup and statement injection.
        '#fff<script>',
        'red;background:url(x)',
        'expression(alert(1))',
        'url(javascript:alert(1))',
        '',
    ])('replaces an unsafe value with the fallback: %s', (value) => {
        expect(safeEmailColor(value)).toBe('#a5000a');
    });
});

describe('sanitizeEmailKitBrand', () => {
    it('keeps safe colours and every text field untouched', () => {
        expect(sanitizeEmailKitBrand(brand)).toEqual(brand);
    });

    it('normalises unsafe primary and accent colours to the fallback', () => {
        const sanitized = sanitizeEmailKitBrand({
            ...brand,
            primaryColor: '#fff" onmouseover="alert(1)',
            accentColor: '#fff"><script>alert(1)</script>',
        });
        expect(sanitized.primaryColor).toBe('#a5000a');
        expect(sanitized.accentColor).toBe('#a5000a');
    });
});

describe('safeLanguageTag', () => {
    it.each(['de', 'en', 'de-DE', 'pt-BR', 'zh-Hans-CN', 'ckb'])('passes well-formed BCP-47 tags: %s', (tag) => {
        expect(safeLanguageTag(tag)).toBe(tag);
    });

    it('trims surrounding whitespace', () => {
        expect(safeLanguageTag('  en-GB  ')).toBe('en-GB');
    });

    it.each([
        // The exact payload from the #751 finding: breaks out of lang="…" and
        // pulls in an outbound resource request.
        'de"><img src="https://example.test/x">',
        'de" onload="alert(1)',
        "de' onload='alert(1)",
        'de><style>body{display:none}</style>',
        'de de',
        '',
        undefined,
    ])('rejects anything outside the grammar: %s', (tag) => {
        expect(safeLanguageTag(tag)).toBe('de');
    });

    it('uses the caller fallback when one is given', () => {
        expect(safeLanguageTag('not a tag!', 'en')).toBe('en');
    });
});

describe('emailKitDocument', () => {
    it('never lets a poisoned language escape the lang attribute', () => {
        const html = emailKitDocument({
            lang: 'de"><img src="https://example.test/x">',
            subject: 'A',
            body: '<tr></tr>',
        });
        expect(html).toContain('<html lang="de">');
        expect(html).not.toContain('example.test');
        expect(html).not.toContain('<img');
    });

    it('keeps a valid tag verbatim', () => {
        expect(emailKitDocument({ lang: 'en-GB', subject: 'A', body: '' })).toContain('<html lang="en-GB">');
    });
});
