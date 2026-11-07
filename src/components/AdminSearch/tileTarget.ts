/**
 * Hand-over from the search to the page it opens: "scroll to this tile and
 * highlight it". It travels in the URL hash (`#tile=<Card titleKey>`), so a
 * result works as a link too (reload, new tab) and no page needs to know about
 * the search. Cards carry `data-search-tile="<titleKey>"` (see `Card`).
 */
const PREFIX = '#tile=';

export const withTileTarget = (to: string, tileKey?: string): string =>
    tileKey ? `${to.split('#')[0]}${PREFIX}${encodeURIComponent(tileKey)}` : to;

export const readTileTarget = (hash: string): string | null => {
    if (!hash.startsWith(PREFIX)) {
        return null;
    }

    try {
        return decodeURIComponent(hash.slice(PREFIX.length));
    } catch {
        // A hand-edited or cut-off link ("#tile=%"): no tile, and no error in the layout.
        return null;
    }
};

/**
 * The key comes from the URL, so it is compared as text instead of being built into a selector:
 * a quote, a backslash or a line break in it would make `querySelector` throw.
 */
export const findTile = (root: ParentNode, tileKey: string): HTMLElement | null =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-search-tile]')).find(
        (element) => element.dataset.searchTile === tileKey,
    ) ?? null;

export const HIGHLIGHT_ATTRIBUTE = 'data-search-highlight';
const HIGHLIGHT_MS = 2600;

/**
 * Scrolls the tile into view and marks it for a moment. The page may still be
 * loading (lazy route, data), so this waits for the tile for up to `timeoutMs`.
 * Returns a cancel function.
 */
export const revealTile = (
    tileKey: string,
    {
        root = document,
        timeoutMs = 5000,
        reducedMotion = false,
    }: { root?: Document; timeoutMs?: number; reducedMotion?: boolean } = {},
): (() => void) => {
    let done = false;
    let clearTimer: number | undefined;
    let observer: MutationObserver | undefined;
    let giveUp: number | undefined;

    const finish = () => {
        done = true;
        observer?.disconnect();
        window.clearTimeout(giveUp);
    };

    const reveal = (element: HTMLElement) => {
        finish();
        element.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
        element.setAttribute(HIGHLIGHT_ATTRIBUTE, 'true');
        clearTimer = window.setTimeout(() => element.removeAttribute(HIGHLIGHT_ATTRIBUTE), HIGHLIGHT_MS);
    };

    const existing = findTile(root, tileKey);

    if (existing) {
        reveal(existing);
    } else {
        observer = new MutationObserver(() => {
            const found = findTile(root, tileKey);

            if (found && !done) {
                reveal(found);
            }
        });
        observer.observe(root.body, { childList: true, subtree: true });
        giveUp = window.setTimeout(finish, timeoutMs);
    }

    return () => {
        finish();
        window.clearTimeout(clearTimer);
        findTile(root, tileKey)?.removeAttribute(HIGHLIGHT_ATTRIBUTE);
    };
};
