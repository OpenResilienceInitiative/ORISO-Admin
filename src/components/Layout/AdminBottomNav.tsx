import { useMemo, useState } from 'react';
import { MoreVert } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AppBottomBar } from '../AppBottomBar';
import { M3NavigationBar } from '../M3NavigationBar';
import { MoreMenuSheet, type MoreMenuSheetGroup } from '../MoreMenuSheet';
import { useNavOverflow } from '../../hooks/useNavOverflow.hook';
import type { AdminSidebarNavItem } from './AdminSidebar';
import { resolveActiveNavKey, toBottomNavItems } from './bottomNavItems';
import styles from './adminBottomNav.module.scss';

/** Sentinel key for the sheet's logout row — it is an action, not a destination. */
const LOGOUT_KEY = 'logout';

export interface AdminBottomNavProps {
    /** Destinations the current user may see — the same array the sidebar gets. */
    items: AdminSidebarNavItem[];
    /** Lower "account" entry; reachable through the overflow sheet only. */
    account: AdminSidebarNavItem;
    logout: { label: string; onLogout: () => void };
    /** Current pathname, used to mark the active destination. */
    currentPath: string;
    lang?: string;
}

/**
 * Mobile bottom navigation: the bar itself plus the overflow sheet behind its
 * "Mehr" segment.
 *
 * Takes the *resolved* nav items from {@link ProtectedPageLayoutWrapper} rather
 * than working out permissions again — one source of truth for who may see
 * what, shared with {@link AdminSidebar}.
 *
 * The search slot is deliberately empty for now: a search belongs to the page,
 * not to the bar, and the context that lets a page register one is its own
 * piece of work. An always-visible pill that searched nothing would be worse
 * than no pill.
 */
export const AdminBottomNav = ({ account, currentPath, items, lang, logout }: AdminBottomNavProps) => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);

    const barItems = useMemo(() => toBottomNavItems(items), [items]);
    const activeKey = resolveActiveNavKey([...items, account], currentPath);
    const { ref, visibleCount, hasOverflow } = useNavOverflow({ itemCount: barItems.length });

    // The active destination stays visible even when it sits past the cut: being
    // unable to see where you are is worse than losing the last slot's item.
    const visible = useMemo(() => {
        const head = barItems.slice(0, visibleCount);

        if (!activeKey || head.some((item) => item.key === activeKey)) {
            return head;
        }

        const active = barItems.find((item) => item.key === activeKey);

        return active ? [active, ...head.slice(0, Math.max(0, visibleCount - 1))] : head;
    }, [activeKey, barItems, visibleCount]);

    // Account and logout live in the sheet because the bar has no room for them
    // and the old mobile layout simply hid `.lowerSidebar` — which left mobile
    // users with no way to sign out at all.
    const groups: MoreMenuSheetGroup[] = [
        {
            label: t('sidebar.sections', 'Bereiche'),
            activeKey,
            entries: [...items, account].map((item) => ({
                key: item.key,
                label: item.label,
                to: item.to,
            })),
        },
        {
            label: t('sidebar.session', 'Konto'),
            entries: [{ key: LOGOUT_KEY, label: logout.label }],
        },
    ];

    return (
        <>
            <div className={styles.bottomNav}>
                <AppBottomBar navSlotRef={ref}>
                    <M3NavigationBar
                        activeKey={activeKey}
                        ariaLabel={t('sidebar.mainNavigation', 'Hauptnavigation')}
                        items={visible}
                        lang={lang}
                        more={
                            hasOverflow || visible.length < barItems.length
                                ? {
                                      label: t('sidebar.more', 'Mehr'),
                                      icon: <MoreVert />,
                                      onClick: () => setMenuOpen(true),
                                      expanded: menuOpen,
                                  }
                                : undefined
                        }
                    />
                </AppBottomBar>
            </div>
            <MoreMenuSheet
                ariaLabel={t('sidebar.moreDestinations', 'Weitere Bereiche')}
                closeLabel={t('sidebar.closeMenu', 'Menü schließen')}
                groups={groups}
                lang={lang}
                onClose={() => setMenuOpen(false)}
                onSelect={(key) => key === LOGOUT_KEY && logout.onLogout()}
                open={menuOpen}
            />
        </>
    );
};

export default AdminBottomNav;
