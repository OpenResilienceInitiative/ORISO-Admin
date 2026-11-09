import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { clearAdminLocalStorage } from '../../api/auth/clearAdminWebStorage';
import { clearRecentSearches, forgetSearch, getRecentSearches, rememberSearch } from './recentSearches';

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('recent searches', () => {
    it('keeps the newest first without duplicates, case-insensitive', () => {
        rememberSearch('smtp');
        rememberSearch('Impressum');
        rememberSearch('SMTP');

        expect(getRecentSearches()).toEqual(['SMTP', 'Impressum']);
    });

    it('ignores one-letter queries and keeps at most six', () => {
        rememberSearch('a');
        ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].forEach(rememberSearch);

        expect(getRecentSearches()).toEqual(['seven', 'six', 'five', 'four', 'three', 'two']);
    });

    it('forgets one entry or all', () => {
        rememberSearch('smtp');
        rememberSearch('logo');

        expect(forgetSearch('smtp')).toEqual(['logo']);

        clearRecentSearches();

        expect(getRecentSearches()).toEqual([]);
    });

    // Raised in review: queries can hold names and e-mail addresses, and a shared computer must not show them
    // to the next admin. The logout already empties every Admin key; this keeps the search inside that rule.
    it('is emptied by the logout, like every other Admin key', () => {
        rememberSearch('anna@example.org');
        window.localStorage.setItem('matrix_device_id', 'kept');

        clearAdminLocalStorage();

        expect(getRecentSearches()).toEqual([]);
        expect(window.localStorage.getItem('matrix_device_id')).toBe('kept');
    });

    it('survives broken or blocked storage', () => {
        window.localStorage.setItem('oriso.admin.search.recent', '{not json');

        expect(getRecentSearches()).toEqual([]);

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(() => rememberSearch('smtp')).not.toThrow();
    });
});
