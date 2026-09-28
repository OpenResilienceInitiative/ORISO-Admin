import { describe, expect, it } from 'vitest';
import { formatLegalDateTime } from './legalDateTime';

describe('formatLegalDateTime', () => {
    it('reads a zoneless wire timestamp as UTC and shows it in Berlin time', () => {
        expect(formatLegalDateTime('2026-09-25T14:31:07', 'de')).toBe('25.09.2026, 16:31');
        expect(formatLegalDateTime('2026-01-10T08:00:00', 'de')).toBe('10.01.2026, 09:00');
    });

    it('keeps an explicit zone and degrades on garbage', () => {
        expect(formatLegalDateTime('2026-09-25T16:31:00+02:00', 'de')).toBe('25.09.2026, 16:31');
        expect(formatLegalDateTime('not a date', 'de')).toBe('not a date');
        expect(formatLegalDateTime(undefined, 'de')).toBe('');
    });
});
