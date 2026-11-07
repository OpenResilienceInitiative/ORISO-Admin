import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
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

    it('survives broken or blocked storage', () => {
        window.localStorage.setItem('oriso.admin.search.recent', '{not json');

        expect(getRecentSearches()).toEqual([]);

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(() => rememberSearch('smtp')).not.toThrow();
    });
});
