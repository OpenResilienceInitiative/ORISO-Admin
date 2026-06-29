import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    clearAuthTokensViaBff: vi.fn(),
    clearSessionTokens: vi.fn(),
}));

vi.mock('./authBffClient', () => ({
    clearAuthTokensViaBff: mocks.clearAuthTokensViaBff,
}));

vi.mock('./tokenSessionStore', () => ({
    clearSessionTokens: mocks.clearSessionTokens,
}));

import { invalidateAuthSession } from './invalidateAuthSession';

describe('invalidateAuthSession', () => {
    beforeEach(() => {
        mocks.clearAuthTokensViaBff.mockReset();
        mocks.clearSessionTokens.mockReset();
    });

    it('clears local session tokens and asks the BFF to clear auth cookies', async () => {
        mocks.clearAuthTokensViaBff.mockResolvedValue(undefined);

        await invalidateAuthSession();

        expect(mocks.clearSessionTokens).toHaveBeenCalledTimes(1);
        expect(mocks.clearAuthTokensViaBff).toHaveBeenCalledTimes(1);
    });

    it('does not fail when the BFF clear request fails', async () => {
        mocks.clearAuthTokensViaBff.mockRejectedValue(new Error('offline'));

        await expect(invalidateAuthSession()).resolves.toBeUndefined();
        expect(mocks.clearSessionTokens).toHaveBeenCalledTimes(1);
    });
});
