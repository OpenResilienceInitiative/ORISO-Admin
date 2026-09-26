import { describe, expect, it } from 'vitest';
import { hasUserSearchFilters, userSearchFilterParams } from './userSearchFilters';

describe('userSearchFilterParams', () => {
    it('adds nothing without filters', () => {
        expect(userSearchFilterParams({})).toBe('');
        expect(userSearchFilterParams({ tenantId: '', agencyIds: [] })).toBe('');
    });

    it('adds the Träger and the centres as a comma list', () => {
        expect(userSearchFilterParams({ tenantId: '3', agencyIds: ['101', '102'] })).toBe(
            '&tenantId=3&agencyId=101%2C102',
        );
    });

    it('can leave the centres out, e.g. for Träger admins who have none', () => {
        expect(userSearchFilterParams({ tenantId: '3', agencyIds: ['101'] }, { agencies: false })).toBe('&tenantId=3');
    });
});

describe('hasUserSearchFilters', () => {
    it('is true once a Träger or a centre is picked', () => {
        expect(hasUserSearchFilters({})).toBe(false);
        expect(hasUserSearchFilters({ tenantId: '3' })).toBe(true);
        expect(hasUserSearchFilters({ agencyIds: ['101'] })).toBe(true);
    });
});
