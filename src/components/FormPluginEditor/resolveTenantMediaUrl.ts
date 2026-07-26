/**
 * Resolves a root-relative tenant media reference (`/media/{id}`, produced by
 * the editor image upload, WP-3b) against the TenantService origin.
 *
 * Stored editor HTML keeps the src relative so it is origin-independent; the
 * resolving image NodeView shows the absolute URL while authoring (the admin is
 * served from an origin that may not route `/media` to the TenantService).
 * Only bare `/media/...` paths are rewritten; absolute/data/blob/other sources
 * pass through, and an empty origin (dev same-origin proxy) leaves it relative.
 */
export const resolveTenantMediaUrl = (src: string | undefined, origin: string): string | undefined => {
    if (!src || !origin || !src.startsWith('/media/')) {
        return src;
    }
    return `${origin.replace(/\/$/, '')}${src}`;
};
