const VALID_DATA_IMAGE_URL = /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i;

/**
 * An HTML entity left in the payload means the value never got decoded on its
 * way out of TenantService (`+` is stored as `&#43;`, see `decodeTenantAsset`).
 * The prefix check alone waves such a string through — it looks like a data
 * image URL — and the browser then silently fails to decode it, leaving the tab
 * with a `<link rel=icon>` pointing at nothing. Better to keep the default
 * favicon than to replace it with a broken one.
 */
const HTML_ENTITY = /&(?:#x?[0-9a-f]+|amp|lt|gt|quot);/i;

export const getSafeFaviconUrl = (favicon?: string): string | undefined => {
    if (!favicon) return undefined;

    try {
        const url = new URL(favicon, window.location.origin);
        if (url.protocol === 'http:' || url.protocol === 'https:') return favicon;
        if (url.protocol === 'data:' && VALID_DATA_IMAGE_URL.test(favicon) && !HTML_ENTITY.test(favicon)) {
            return favicon;
        }
    } catch {
        return undefined;
    }

    return undefined;
};
