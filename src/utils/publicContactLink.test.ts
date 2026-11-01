import { describe, expect, it } from 'vitest';
import { buildPublicContactLinkUrl, isValidPublicSlug } from './publicContactLink';

// ORISO-UserService#1534: same rule as the UserService (PublicSlugFormat).
describe('isValidPublicSlug', () => {
    it.each(['team-2', 'beratung-24', 'qa-shazia-2810', 'qa-shazia-test', '2810', 'a'])('accepts %s', (slug) => {
        expect(isValidPublicSlug(slug)).toBe(true);
    });

    it.each(['-a', 'a-', 'a--b', 'QA-Shazia', 'qa shazia', 'qa_shazia', 'beratung-ü', '', '-'])(
        'rejects "%s"',
        (slug) => {
            expect(isValidPublicSlug(slug)).toBe(false);
        },
    );
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
