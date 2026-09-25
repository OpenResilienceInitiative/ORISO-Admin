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

        // A detached element of the live page still loads <img> and fires onerror; the name must never get there.
        it('parses it outside the live page and keeps only the text', () => {
            const createElement = vi.spyOn(document, 'createElement');

            expect(decodeHTML('<img src=x onerror="alert(1)">Caritas &#43; Diakonie')).toBe('Caritas + Diakonie');
            expect(createElement).not.toHaveBeenCalled();
        });
    });
});
