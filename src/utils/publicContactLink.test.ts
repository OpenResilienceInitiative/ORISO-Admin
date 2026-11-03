import { describe, expect, it } from 'vitest';
import { buildPublicContactLinkUrl, isValidPublicSlug, PUBLIC_SLUG_MAX_LENGTH } from './publicContactLink';

// ORISO-UserService#1534: same rule as the UserService (PublicSlugFormat).
describe('isValidPublicSlug', () => {
    it.each(['team-2', 'beratung-24', 'qa-shazia-2810', 'qa-shazia-test', '2810', 'a'])('accepts %s', (slug) => {
        expect(isValidPublicSlug(slug)).toBe(true);
    });

    // The UserService looks names up as consultant ids first, so a name that parses as a UUID
    // (Java UUID.fromString: five hex groups) could never be opened and is rejected there.
    it.each(['1-2-3-4-5', 'a-b-c-d-e', 'deadbeef-1-2-3-4', '4fa1c9e2-0b7d-4c3a-9e11-2f5c6d7e8a90'])(
        'rejects the id-shaped "%s"',
        (slug) => {
            expect(isValidPublicSlug(slug)).toBe(false);
        },
    );

    it.each(['1-2-3-4', '1-2-3-4-5-6', 'team-2-3-4-x'])('accepts the non-id "%s"', (slug) => {
        expect(isValidPublicSlug(slug)).toBe(true);
    });

    it.each(['-a', 'a-', 'a--b', 'QA-Shazia', 'qa shazia', 'qa_shazia', 'beratung-ü', '', '-'])(
        'rejects "%s"',
        (slug) => {
            expect(isValidPublicSlug(slug)).toBe(false);
        },
    );
});

// ORISO-UserService#1543: same 50-character maximum as the UserService.
describe('public link name length', () => {
    it('is limited to 50 characters', () => {
        expect(PUBLIC_SLUG_MAX_LENGTH).toBe(50);
    });

    it('accepts a name of exactly the maximum length', () => {
        expect(isValidPublicSlug(`${'a'.repeat(48)}-2`)).toBe(true);
    });

    it.each([51, 129])('rejects a name of %i characters', (length) => {
        expect(isValidPublicSlug('a'.repeat(length))).toBe(false);
    });
});

describe('buildPublicContactLinkUrl', () => {
    it('builds the registration link the counselling app resolves', () => {
        expect(buildPublicContactLinkUrl('qa-shazia-2810', 'https://app.example.org')).toBe(
            'https://app.example.org/registration?cid=qa-shazia-2810',
        );
    });

    it('does not double the slash of a base URL that ends with one', () => {
        expect(buildPublicContactLinkUrl('team-2', 'https://app.example.org/')).toBe(
            'https://app.example.org/registration?cid=team-2',
        );
    });

    it('returns null when there is no link name or no base URL', () => {
        expect(buildPublicContactLinkUrl('', 'https://app.example.org')).toBeNull();
        expect(buildPublicContactLinkUrl(undefined, 'https://app.example.org')).toBeNull();
        expect(buildPublicContactLinkUrl('team-2', '')).toBeNull();
    });
});
