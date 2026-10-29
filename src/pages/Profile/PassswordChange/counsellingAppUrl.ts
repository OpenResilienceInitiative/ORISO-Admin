import { configuredAppURL } from '../../../appConfig';

/**
 * Base URL of the counselling app (ORISO-Frontend), or `null` when the admin does not know it.
 * Reads the explicitly configured APP_URL only: `runtimeConfig.appBaseUrl` falls back to the API URL,
 * which may be a different origin than the counselling app. An absolute http(s) URL on the admin's own
 * origin is hidden too (single-domain deployments).
 */
export const getCounsellingAppUrl = (
    baseUrl: string = configuredAppURL,
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
