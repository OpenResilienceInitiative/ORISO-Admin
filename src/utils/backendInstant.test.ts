import { describe, expect, it } from 'vitest';
import { withUtcInstants } from './backendInstant';

describe('withUtcInstants', () => {
    it.each([
        ['2026-09-21T17:26:02', '2026-09-21T17:26:02Z'],
        ['2026-09-21T17:26:02.123', '2026-09-21T17:26:02.123Z'],
        ['2026-09-21T17:26', '2026-09-21T17:26Z'],
        ['2026-09-21T17:26:02Z', '2026-09-21T17:26:02Z'],
        ['2026-09-21T19:26:02+02:00', '2026-09-21T19:26:02+02:00'],
        ['2026-09-21', '2026-09-21'],
        ['Caritas 2026-09-21T17:26', 'Caritas 2026-09-21T17:26'],
    ])('reads %s as %s', (raw, expected) => {
        expect(withUtcInstants(raw)).toBe(expected);
    });

    it('rewrites nested objects and lists without touching other values', () => {
        expect(
            withUtcInstants({
                id: 1,
                createDate: '2026-09-21T17:26:02',
                rows: [{ at: '2026-09-21T08:00:00' }],
                n: null,
            }),
        ).toEqual({ id: 1, createDate: '2026-09-21T17:26:02Z', rows: [{ at: '2026-09-21T08:00:00Z' }], n: null });
    });
});
