const VALID_DATA_IMAGE_URL = /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i;

export const getSafeFaviconUrl = (favicon?: string): string | undefined => {
    if (!favicon) return undefined;

    try {
        const url = new URL(favicon, window.location.origin);
        if (url.protocol === 'http:' || url.protocol === 'https:') return favicon;
        if (url.protocol === 'data:' && VALID_DATA_IMAGE_URL.test(favicon)) return favicon;
    } catch {
        return undefined;
    }

    return undefined;
};
