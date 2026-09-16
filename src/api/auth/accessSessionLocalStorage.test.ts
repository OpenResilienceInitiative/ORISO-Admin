import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ACCESS_TOKEN_VALID_UNTIL_KEY,
    REFRESH_TOKEN_VALID_UNTIL_KEY,
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

    afterEach(() => {
        vi.useRealTimers();
    });

    it('stores token expiry timestamps from relative seconds', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-29T10:00:00.000Z'));

        setTokenExpiryInLocalStorage(ACCESS_TOKEN_VALID_UNTIL_KEY, 30);

        expect(getLocalStorageItem(ACCESS_TOKEN_VALID_UNTIL_KEY)).toBe(
            String(new Date('2026-06-29T10:00:30.000Z').getTime()),
        );
    });

    it('returns parsed access and refresh token expiry timestamps', () => {
        localStorage.setItem(ACCESS_TOKEN_VALID_UNTIL_KEY, '1000');
        localStorage.setItem(REFRESH_TOKEN_VALID_UNTIL_KEY, '2000');

        expect(getTokenExpiryFromLocalStorage()).toEqual({
            accessTokenValidUntilTime: 1000,
            refreshTokenValidUntilTime: 2000,
        });
    });

    it('removes both stored token expiry values', () => {
        localStorage.setItem(ACCESS_TOKEN_VALID_UNTIL_KEY, '1000');
        localStorage.setItem(REFRESH_TOKEN_VALID_UNTIL_KEY, '2000');

        removeTokenExpiryFromLocalStorage();

        expect(localStorage.getItem(ACCESS_TOKEN_VALID_UNTIL_KEY)).toBeNull();
        expect(localStorage.getItem(REFRESH_TOKEN_VALID_UNTIL_KEY)).toBeNull();
    });

    // The counselling app on the same host keeps its own expiry under `auth.*`. Sharing those keys
    // meant an Admin login rewrote the app's session timers and an Admin logout ended the app
    // session.
    it('keeps its expiry apart from the counselling app on the same host', () => {
        localStorage.setItem('auth.access_token_valid_until', '111');
        localStorage.setItem('auth.refresh_token_valid_until', '222');

        expect(ACCESS_TOKEN_VALID_UNTIL_KEY).not.toBe('auth.access_token_valid_until');
        expect(REFRESH_TOKEN_VALID_UNTIL_KEY).not.toBe('auth.refresh_token_valid_until');
        expect(Number.isNaN(getTokenExpiryFromLocalStorage().accessTokenValidUntilTime)).toBe(true);

        setTokenExpiryInLocalStorage(ACCESS_TOKEN_VALID_UNTIL_KEY, 30);
        removeTokenExpiryFromLocalStorage();

        expect(localStorage.getItem('auth.access_token_valid_until')).toBe('111');
        expect(localStorage.getItem('auth.refresh_token_valid_until')).toBe('222');
    });
});
