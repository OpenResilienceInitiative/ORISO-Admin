import type { AdminSidebarNavItem } from './AdminSidebar';

const isPathMatch = (currentPath: string, activeMatch?: AdminSidebarNavItem['activeMatch']): boolean => {
    if (!activeMatch) {
        return false;
    }

    return activeMatch.paths.some((path) =>
        activeMatch.mode === 'startsWith' ? currentPath.startsWith(path) : currentPath.includes(path),
    );
};

/**
 * Picks the nav item that owns `currentPath`. Longest `to` wins among prefix
 * matches; `activeMatch` covers sibling routes that do not sit under the item's
 * landing path (Users/Logs hubs, role-specific settings landings).
 */
export const resolveActiveNavKey = (
    items: ReadonlyArray<AdminSidebarNavItem>,
    currentPath: string,
): string | undefined => {
    const matches = items.filter(
        (item) =>
            currentPath === item.to ||
            currentPath.startsWith(`${item.to}/`) ||
            isPathMatch(currentPath, item.activeMatch),
    );

    return matches.sort((a, b) => b.to.length - a.to.length)[0]?.key;
};
