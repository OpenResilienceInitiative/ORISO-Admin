import { describe, expect, it, vi } from 'vitest';
import { berlinSigningDeadline } from './dpaSigningDeadline';

describe('explicit Europe/Berlin signing deadline', () => {
    it('converts winter and summer wall clock times with their correct offset', () => {
        expect(berlinSigningDeadline('2099-01-15T15:30', 0)).toBe('2099-01-15T15:30:00+01:00');
        expect(berlinSigningDeadline('2099-07-15T15:30', 0)).toBe('2099-07-15T15:30:00+02:00');
    });
    it.each(['', 'not a date', '2026-02-30T12:00', '2026-03-29T02:30'])(
        'rejects invalid and nonexistent local times: %s',
        (input) => {
            expect(berlinSigningDeadline(input, 0)).toBeNull();
        },
    );
    it('uses the first occurrence of an autumn repeated hour, independent of the publication month', () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
            expect(berlinSigningDeadline('2026-10-25T02:30', 0)).toBe('2026-10-25T02:30:00+02:00');
        } finally {
            vi.useRealTimers();
        }
    });
    it('requires the instant to still be in the future at confirmation', () => {
        expect(berlinSigningDeadline('2026-10-01T15:30', Date.parse('2026-10-01T13:30:00Z'))).toBeNull();
    });
});
