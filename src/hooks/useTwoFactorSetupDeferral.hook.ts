import { useCallback, useEffect, useState } from 'react';
import { deferTwoFactorSetup, isTwoFactorSetupDeferred } from '../utils/twoFactorSetupDeferral';

/**
 * Tracks whether the current admin skipped the two-factor setup prompt.
 *
 * `username` arrives asynchronously with the user data, so the stored value is
 * re-read whenever it changes instead of only on mount.
 */
export const useTwoFactorSetupDeferral = (username?: string) => {
    const [isDeferred, setIsDeferred] = useState<boolean>(() => isTwoFactorSetupDeferred(username));

    useEffect(() => {
        setIsDeferred(isTwoFactorSetupDeferred(username));
    }, [username]);

    const deferSetup = useCallback(() => {
        deferTwoFactorSetup(username);
        setIsDeferred(true);
    }, [username]);

    return { isDeferred, deferSetup };
};
