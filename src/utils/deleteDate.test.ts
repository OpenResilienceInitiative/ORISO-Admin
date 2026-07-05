import { describe, expect, it } from 'vitest';
import { isActiveDeleteDate, isActiveRecord } from './deleteDate';

describe('deleteDate helpers', () => {
    it.each([undefined, null, 'null'])('treats %s as active', (deleteDate) => {
        expect(isActiveDeleteDate(deleteDate)).toBe(true);
        expect(isActiveRecord({ deleteDate })).toBe(true);
    });

    it('treats timestamp strings as deleted', () => {
        expect(isActiveDeleteDate('2026-06-25T12:00:00')).toBe(false);
        expect(isActiveRecord({ deleteDate: '2026-06-25T12:00:00' })).toBe(false);
    });
});
