import { getSafeFaviconUrl } from './getSafeFaviconUrl';

/**
 * Branding fallback order for the browser tab icon:
 *
 *   1. the tenant's own uploaded favicon,
 *   2. the platform default — in single-domain multitenancy that is the main
 *      tenant (`mainTenantSubdomainForSingleDomainMultitenancy`), which is what
 *      the platform admin edits and what `GET /service/tenant/public/` returns
 *      to anonymous visitors,
 *   3. nothing — the built-in `favicon.ico` shipped in `index.html` stays.
 *
 * A candidate that {@link getSafeFaviconUrl} refuses (e.g. an undecoded
 * `&#61;`-carrying data URL) is skipped rather than applied broken, so a damaged
 * tenant asset still falls through to the platform default.
 */
export const resolveBrandingFavicon = (tenantFavicon?: string, platformFavicon?: string): string | undefined =>
    getSafeFaviconUrl(tenantFavicon) ?? getSafeFaviconUrl(platformFavicon);

export default resolveBrandingFavicon;
