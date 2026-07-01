import { describe, expect, it } from 'vitest';
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
});
