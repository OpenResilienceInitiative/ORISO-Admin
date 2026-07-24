const STORAGE_KEY = 'oriso.admin.twoFactorSetupDeferredFor';

/**
 * Remembers that an admin chose "set up later" on the two-factor prompt.
 *
 * Scoped to the browser session on purpose: skipping unblocks the admin area
 * for the rest of this session, and the prompt returns at the next login so
 * 2FA keeps being encouraged rather than silently dropped forever. The value
 * is the username, so a different admin signing in on the same browser is
 * still prompted.
 *
 * Logout already calls sessionStorage.clear(), so signing out drops the
 * deferral without any extra bookkeeping here.
 *
 * Storage access is wrapped because sessionStorage throws in some privacy
 * modes; a failure there must never block the admin area.
 */
export const isTwoFactorSetupDeferred = (username?: string): boolean => {
    if (!username) return false;

    try {
        return sessionStorage.getItem(STORAGE_KEY) === username;
    } catch {
        return false;
    }
};

export const deferTwoFactorSetup = (username?: string): void => {
    if (!username) return;

    try {
        sessionStorage.setItem(STORAGE_KEY, username);
    } catch {
        // Ignored: a browser that refuses storage just re-prompts on reload.
    }
};
