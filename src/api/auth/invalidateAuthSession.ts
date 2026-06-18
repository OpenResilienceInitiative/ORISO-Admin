import { clearAuthTokensViaBff } from './authBffClient';
import { clearSessionTokens } from './tokenSessionStore';

export const invalidateAuthSession = async (): Promise<void> => {
    clearSessionTokens();
    try {
        await clearAuthTokensViaBff();
    } catch {
        // Logout should still clear local state even if the BFF is unavailable.
    }
};
