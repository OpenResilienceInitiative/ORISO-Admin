import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearSessionTokens,
    getSessionAccessToken,
    getSessionRefreshToken,
    hasSessionTokens,
    setSessionTokens,
} from './tokenSessionStore';

describe('tokenSessionStore', () => {
    beforeEach(() => {
        clearSessionTokens();
    });

    it('stores access and refresh tokens in memory', () => {
        setSessionTokens('access', 'refresh');

        expect(getSessionAccessToken()).toBe('access');
        expect(getSessionRefreshToken()).toBe('refresh');
        expect(hasSessionTokens()).toBe(true);
    });

    it('clears missing or empty token values', () => {
        setSessionTokens('access', undefined);

        expect(getSessionAccessToken()).toBe('access');
        expect(getSessionRefreshToken()).toBe('');
        expect(hasSessionTokens()).toBe(false);

        clearSessionTokens();
        expect(getSessionAccessToken()).toBe('');
    });
});
