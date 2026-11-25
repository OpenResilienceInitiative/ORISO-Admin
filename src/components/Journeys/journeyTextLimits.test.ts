import { describe, expect, it } from 'vite-plus/test';
import { lengthState } from './journeyTextLimits';

describe('journey text lengths (Frank, 2026-11-20)', () => {
    it('is fine well below the limit, says what is left near it, and how much is too much over it', () => {
        expect(lengthState('kurz', 70)).toEqual({ kind: 'ok' });
        expect(lengthState('x'.repeat(60), 70)).toEqual({ kind: 'warn', left: 10 });
        expect(lengthState('x'.repeat(75), 70)).toEqual({ kind: 'over', over: 5 });
    });

    it('counts what the person reads, without markup', () => {
        expect(lengthState(`<p>${'x'.repeat(70)}</p>`, 70)).toEqual({ kind: 'warn', left: 0 });
    });
});
