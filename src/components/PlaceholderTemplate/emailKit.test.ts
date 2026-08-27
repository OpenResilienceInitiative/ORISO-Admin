import { describe, expect, it } from 'vitest';
import { safeLanguageTag } from './emailKit';

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
