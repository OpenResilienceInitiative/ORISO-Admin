import { appURL } from '../../../appConfig';

/**
 * Base URL of the counselling app (ORISO-Frontend), or `null` when the admin does not know it.
 * `runtimeConfig.appBaseUrl` falls back to the API URL — the admin's own origin on a single-domain
 * deployment — so only an absolute http(s) URL on a different origin counts as a known app URL.
 */
export const getCounsellingAppUrl = (
    baseUrl: string = appURL,
    currentOrigin: string = window.location.origin,
): string | null => {
    const trimmed = baseUrl.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
        return null;
    }
    try {
        return new URL(trimmed).origin === currentOrigin ? null : trimmed;
    } catch {
        return null;
    }
};
