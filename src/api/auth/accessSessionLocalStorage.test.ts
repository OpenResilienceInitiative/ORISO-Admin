import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getLocalStorageItem,
    getTokenExpiryFromLocalStorage,
    removeTokenExpiryFromLocalStorage,
    setTokenExpiryInLocalStorage,
} from './accessSessionLocalStorage';

describe('access session local storage helpers', () => {
    const storage = new Map<string, string>();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => storage.get(key) ?? null),
            removeItem: vi.fn((key: string) => {
                storage.delete(key);
            }),
            setItem: vi.fn((key: string, value: string) => {
                storage.set(key, value);
            }),
        });
        vi.useRealTimers();
    });

    it('stores token expiry timestamps from relative seconds', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-29T10:00:00.000Z'));

        setTokenExpiryInLocalStorage('auth.access_token_valid_until', 30);

        expect(getLocalStorageItem('auth.access_token_valid_until')).toBe(
            String(new Date('2026-06-29T10:00:30.000Z').getTime()),
        );
    });

    it('returns parsed access and refresh token expiry timestamps', () => {
        localStorage.setItem('auth.access_token_valid_until', '1000');
        localStorage.setItem('auth.refresh_token_valid_until', '2000');

        expect(getTokenExpiryFromLocalStorage()).toEqual({
            accessTokenValidUntilTime: 1000,
            refreshTokenValidUntilTime: 2000,
        });
    });

    it('removes both stored token expiry values', () => {
        localStorage.setItem('auth.access_token_valid_until', '1000');
        localStorage.setItem('auth.refresh_token_valid_until', '2000');

        removeTokenExpiryFromLocalStorage();

        expect(localStorage.getItem('auth.access_token_valid_until')).toBeNull();
        expect(localStorage.getItem('auth.refresh_token_valid_until')).toBeNull();
    });
});
