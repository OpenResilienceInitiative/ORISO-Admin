import { getAccentDark, getAccentLight, getSignal, TenantSeeds } from '../../../../../utils/themeSeeds';

/**
 * The app has to be a different origin than the admin. `allow-same-origin`
 * keeps the frame on its own origin, so cross-origin is the only thing
 * isolating it from admin cookies and Keycloak tokens. A blank, relative or
 * same-origin base quietly drops that isolation — and `/theme-demo` does not
 * exist on the admin anyway, so the frame would only show its error page.
 * Without a configured app origin there is no preview, which is the point:
 * `runtimeConfig` falls back to the admin's own origin when unset.
 */
const isSeparateOrigin = (appBaseUrl: string): boolean => {
    const trimmed = appBaseUrl.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
        return false;
    }
    try {
        return new URL(trimmed).origin !== window.location.origin;
    } catch {
        return false;
    }
};

/**
 * Builds the preview URL for the sandboxed app iframe: the auth-free
 * /theme-demo route (real session list + chat room with mock content)
 * plus the draft seeds as bare 6-digit hex params (mirrored by
 * readPreviewSeeds in ORISO-Frontend, which validates strictly and
 * applies colours only).
 */
export const buildPreviewUrl = (appBaseUrl: string, seeds: TenantSeeds): string | null => {
    if (!appBaseUrl || !isSeparateOrigin(appBaseUrl)) {
        return null;
    }
    const bare = (value?: string) => value?.replace(/^#/, '').toLowerCase();
    const primary = bare(getAccentDark(seeds));
    if (!primary || !/^[0-9a-f]{6}$/.test(primary)) {
        return null;
    }
    const params = new URLSearchParams({ themePreviewPrimary: primary });
    const accent = bare(getAccentLight(seeds));
    const signal = bare(getSignal(seeds));
    if (accent && /^[0-9a-f]{6}$/.test(accent)) {
        params.set('themePreviewAccent', accent);
    }
    if (signal && /^[0-9a-f]{6}$/.test(signal)) {
        params.set('themePreviewSignal', signal);
    }
    return `${appBaseUrl.replace(/\/$/, '')}/theme-demo?${params.toString()}`;
};
