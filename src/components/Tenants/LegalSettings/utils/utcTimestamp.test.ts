import { describe, expect, it } from 'vitest';
import { parseUtcTimestamp } from './utcTimestamp';

describe('parseUtcTimestamp', () => {
    it('reads a zoneless server time as UTC', () => {
        expect(parseUtcTimestamp('2026-09-21T12:02:00').toISOString()).toBe('2026-09-21T12:02:00.000Z');
    });

    it('keeps an explicit offset', () => {
        expect(parseUtcTimestamp('2026-09-21T14:02:00+02:00').toISOString()).toBe('2026-09-21T12:02:00.000Z');
        expect(parseUtcTimestamp('2026-09-21T12:02:00Z').toISOString()).toBe('2026-09-21T12:02:00.000Z');
    });
});
