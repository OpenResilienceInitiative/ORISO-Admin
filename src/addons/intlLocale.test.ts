import { describe, expect, it } from 'vite-plus/test';
import { formatDateTime, intlLocale } from './intlLocale';

describe('intlLocale', () => {
    it('strips the informal suffix so Intl accepts the tag', () => {
        expect(intlLocale('de@informal')).toBe('de');
        expect(intlLocale('en')).toBe('en');
        expect(intlLocale(undefined)).toBeUndefined();
    });

    it('formats a date for de@informal without throwing', () => {
        expect(() => formatDateTime('2026-11-17T10:00:00Z', 'de@informal')).not.toThrow();
        expect(formatDateTime('2026-11-17T10:00:00Z', 'de@informal')).toBe(
            new Date('2026-11-17T10:00:00Z').toLocaleString('de'),
        );
    });
});
