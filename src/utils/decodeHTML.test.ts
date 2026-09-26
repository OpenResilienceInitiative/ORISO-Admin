import { afterEach, describe, expect, it, vi } from 'vitest';
import decodeHTML from './decodeHTML';

describe('decodeHTML', () => {
    it('decodes numeric HTML entities (the "+" case from the backend)', () => {
        expect(decodeHTML('&#43;49 123')).toBe('+49 123');
    });

    it('decodes named entities', () => {
        expect(decodeHTML('Tom &amp; Jerry')).toBe('Tom & Jerry');
        expect(decodeHTML('a &lt; b &gt; c')).toBe('a < b > c');
    });

    it('leaves plain text unchanged', () => {
        expect(decodeHTML('Beratungsstelle Nord')).toBe('Beratungsstelle Nord');
    });

    it('returns an empty string for empty input', () => {
        expect(decodeHTML('')).toBe('');
    });

    describe('with markup in a stored name', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        // Any parser may still fetch <img>/<iframe> sources; the name must stay text and never become markup.
        it('decodes entities as text and never builds an element', () => {
            const createElement = vi.spyOn(document, 'createElement');
            const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
            const fragment = vi.spyOn(Range.prototype, 'createContextualFragment');

            expect(decodeHTML('<img src=x onerror="alert(1)">Caritas &#43; Diakonie')).toBe(
                '<img src=x onerror="alert(1)">Caritas + Diakonie',
            );
            expect(decodeHTML('&lt;iframe src=&quot;https://evil.example&quot;&gt;')).toBe(
                '<iframe src="https://evil.example">',
            );
            expect(createElement).not.toHaveBeenCalled();
            expect(parse).not.toHaveBeenCalled();
            expect(fragment).not.toHaveBeenCalled();
        });
    });

    it('decodes hex, German letters and apostrophes, and leaves unknown entities alone', () => {
        expect(decodeHTML('&#x2B;&auml;&Uuml;&szlig;&#39;&apos;&nbsp;&unknown;')).toBe("+äÜß''\u00a0&unknown;");
    });
});
