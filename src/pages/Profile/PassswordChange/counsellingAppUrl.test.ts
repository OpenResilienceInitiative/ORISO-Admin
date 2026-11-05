import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCounsellingAppUrl } from './counsellingAppUrl';

describe('getCounsellingAppUrl', () => {
    it('returns an absolute app URL on another origin', () => {
        expect(getCounsellingAppUrl('https://app.example.org', 'https://admin.example.org')).toBe(
            'https://app.example.org',
        );
    });

    it('returns null for same-origin fallbacks, blanks and relative values', () => {
        expect(getCounsellingAppUrl('https://admin.example.org', 'https://admin.example.org')).toBeNull();
        expect(getCounsellingAppUrl('', 'https://admin.example.org')).toBeNull();
        expect(getCounsellingAppUrl('/app', 'https://admin.example.org')).toBeNull();
    });
});

describe('getCounsellingAppUrl with the runtime config default', () => {
    const ADMIN_ORIGIN = 'https://admin.example.org';

    const load = async (config: Record<string, string>) => {
        vi.resetModules();
        ['API_URL', 'APP_URL', 'USE_HTTPS', 'USE_API_URL'].forEach((key) => {
            vi.stubEnv(`VITE_${key}`, '');
            vi.stubEnv(`REACT_APP_${key}`, '');
        });
        window.__APP_CONFIG__ = config;
        return (await import('./counsellingAppUrl')).getCounsellingAppUrl;
    };

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
        window.__APP_CONFIG__ = {};
    });

    it('shows no link when APP_URL is unset, even if the API lives on another origin', async () => {
        const getUrl = await load({ API_URL: 'https://api.example.org' });
        expect(getUrl(undefined, ADMIN_ORIGIN)).toBeNull();
    });

    it('links to a configured APP_URL on another origin', async () => {
        const getUrl = await load({ API_URL: 'https://api.example.org', APP_URL: 'https://app.example.org' });
        expect(getUrl(undefined, ADMIN_ORIGIN)).toBe('https://app.example.org');
    });

    it('shows no link when the configured APP_URL shares the admin origin', async () => {
        const getUrl = await load({ APP_URL: ADMIN_ORIGIN });
        expect(getUrl(undefined, ADMIN_ORIGIN)).toBeNull();
    });
});
