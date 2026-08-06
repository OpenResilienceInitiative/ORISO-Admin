import type { ReactNode } from 'react';
import {
    Assessment,
    AssessmentOutlined,
    History,
    HistoryOutlined,
    HolidayVillage,
    HolidayVillageOutlined,
    Link as LinkIcon,
    LinkOutlined,
    ListAlt,
    ListAltOutlined,
    People,
    PeopleOutlined,
    RealEstateAgent,
    RealEstateAgentOutlined,
    Settings,
    SettingsOutlined,
} from '@mui/icons-material';
import type { AdminSidebarNavItem } from './AdminSidebar';
import type { M3NavigationBarItem } from '../M3NavigationBar';

/**
 * Bottom-bar icons, keyed by the nav item's stable `key` rather than its route:
 * routes move between roles (the settings entry alone resolves to five
 * different paths), the key does not.
 *
 * These are MUI glyphs, not the `navbar/*.svg` set the desktop sidebar uses.
 * That set cannot serve this bar: 30 of its 34 files carry hard-coded fills
 * (plus Figma's mask artefact), so the icon could never turn white on the dark
 * red active indicator. MUI icons inherit `currentColor` and ship the
 * outlined/filled pair M3 wants for unselected/selected. The sidebar keeps its
 * own icons untouched.
 */
const BOTTOM_NAV_ICONS: Record<string, { icon: ReactNode; activeIcon: ReactNode }> = {
    theme: { icon: <SettingsOutlined />, activeIcon: <Settings /> },
    tenants: { icon: <HolidayVillageOutlined />, activeIcon: <HolidayVillage /> },
    agency: { icon: <RealEstateAgentOutlined />, activeIcon: <RealEstateAgent /> },
    counselors: { icon: <PeopleOutlined />, activeIcon: <People /> },
    statistics: { icon: <AssessmentOutlined />, activeIcon: <Assessment /> },
    links: { icon: <LinkOutlined />, activeIcon: <LinkIcon /> },
    logs: { icon: <ListAltOutlined />, activeIcon: <ListAlt /> },
    'activity-logs': { icon: <HistoryOutlined />, activeIcon: <History /> },
};

const isPathMatch = (currentPath: string, item: AdminSidebarNavItem): boolean => {
    if (!item.activeMatch) {
        return false;
    }

    return item.activeMatch.paths.some((path) =>
        item.activeMatch?.mode === 'startsWith' ? currentPath.startsWith(path) : currentPath.includes(path),
    );
};

/** Adapts the sidebar's nav items to the bottom bar, keeping one source of permissions. */
export const toBottomNavItems = (items: AdminSidebarNavItem[]): M3NavigationBarItem[] =>
    items.map((item) => ({
        key: item.key,
        label: item.label,
        to: item.to,
        icon: BOTTOM_NAV_ICONS[item.key]?.icon ?? <ListAltOutlined />,
        activeIcon: BOTTOM_NAV_ICONS[item.key]?.activeIcon ?? <ListAlt />,
    }));

/**
 * Which destination the bar should mark as current. Mirrors the sidebar's own
 * rule (`NavLink` match OR the item's `activeMatch`), and prefers the longest
 * matching route so `/admin/logs/activity` does not also light up `/admin/logs`.
 */
export const resolveActiveNavKey = (items: AdminSidebarNavItem[], currentPath: string): string | undefined => {
    const matches = items.filter(
        (item) => currentPath === item.to || currentPath.startsWith(`${item.to}/`) || isPathMatch(currentPath, item),
    );

    return matches.sort((a, b) => b.to.length - a.to.length)[0]?.key;
};
