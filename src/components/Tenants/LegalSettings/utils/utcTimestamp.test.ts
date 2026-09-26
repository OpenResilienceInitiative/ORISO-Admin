import { describe, expect, it } from 'vitest';
import { formatBerlinDateTime, parseUtcTimestamp } from './utcTimestamp';

describe('parseUtcTimestamp', () => {
    it('reads a zoneless server time as UTC', () => {
        expect(parseUtcTimestamp('2026-09-21T12:02:00').toISOString()).toBe('2026-09-21T12:02:00.000Z');
    });

    it('keeps an explicit offset', () => {
        expect(parseUtcTimestamp('2026-09-21T14:02:00+02:00').toISOString()).toBe('2026-09-21T12:02:00.000Z');
        expect(parseUtcTimestamp('2026-09-21T12:02:00Z').toISOString()).toBe('2026-09-21T12:02:00.000Z');
    });
});

describe('formatBerlinDateTime', () => {
    it('shows a zoneless UTC stamp in Berlin time (07:55 UTC → 09:55 in summer)', () => {
        expect(formatBerlinDateTime('2026-09-25T07:55:00', 'de')).toContain('09:55');
    });

    it('returns an unparseable value unchanged', () => {
        expect(formatBerlinDateTime('not a date', 'de')).toBe('not a date');
    });
});
