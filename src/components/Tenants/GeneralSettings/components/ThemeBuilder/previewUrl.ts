import { TenantSeeds } from '../../../../../utils/themeSeeds';

/**
 * Builds the preview URL for the sandboxed app iframe: the auth-free
 * /theme-demo route (real session list + chat room with mock content)
 * plus the draft seeds as bare 6-digit hex params (mirrored by
 * readPreviewSeeds in ORISO-Frontend, which validates strictly and
 * applies colours only).
 */
export const buildPreviewUrl = (appBaseUrl: string, seeds: TenantSeeds): string | null => {
    const bare = (value?: string) => value?.replace(/^#/, '').toLowerCase();
    const primary = bare(seeds.primary);
    if (!primary || !/^[0-9a-f]{6}$/.test(primary)) {
        return null;
    }
    const params = new URLSearchParams({ themePreviewPrimary: primary });
    const accent = bare(seeds.accent);
    const signal = bare(seeds.signal);
    if (accent && /^[0-9a-f]{6}$/.test(accent)) {
        params.set('themePreviewAccent', accent);
    }
    if (signal && /^[0-9a-f]{6}$/.test(signal)) {
        params.set('themePreviewSignal', signal);
    }
    return `${appBaseUrl.replace(/\/$/, '')}/theme-demo?${params.toString()}`;
};
