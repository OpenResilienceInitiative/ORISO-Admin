import { describe, expect, it } from 'vitest';
import { getCounsellingAppUrl } from './counsellingAppUrl';

describe('getCounsellingAppUrl', () => {
    it('returns an absolute app URL on another origin', () => {
        expect(getCounsellingAppUrl('https://app.example.org', 'https://admin.example.org')).toBe(
            'https://app.example.org',
        );
    });

    it('returns null for same-origin fallbacks, blanks and relative values', () => {
        expect(getCounsellingAppUrl('https://admin.example.org', 'https://admin.example.org')).toBeNull();
        expect(getCounsellingAppUrl('', 'https://admin.example.org')).toBeNull();
        expect(getCounsellingAppUrl('/app', 'https://admin.example.org')).toBeNull();
    });
});
