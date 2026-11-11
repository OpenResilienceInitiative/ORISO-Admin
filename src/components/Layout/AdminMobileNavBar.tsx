import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AdminMobileNav, type AdminMobileNavItem, type AdminMobileNavSection } from '../AdminMobileNav';
import { useMobileNav } from '../AdminMobileNav/MobileNavContext';
import { useAdminSearch } from '../AdminSearch';
import { NavGlyph, type NavGlyphName } from '../NavGlyph';
import type { AdminSidebarNavItem } from './AdminSidebar';
import type { AdminNavSubsection } from './adminNavTree';
import { resolveActiveNavKey } from './resolveActiveNavKey';
import styles from './adminMobileNavBar.module.scss';

/**
 * Glyph per nav item, keyed by the item's stable `key` rather than its route:
 * the settings entry alone resolves to five different paths depending on role,
 * the key does not.
 */
const SECTION_GLYPHS: Record<string, NavGlyphName> = {
    home: 'home',
    theme: 'displaySettings',
    tenants: 'tenants',
    agency: 'counseling',
    counselors: 'users',
    statistics: 'statistics',
    links: 'links',
    logs: 'logs',
    'activity-logs': 'logs',
    account: 'profile',
    logout: 'logout',
};

export interface AdminMobileNavBarProps {
    /** The same resolved destinations the sidebar gets. */
    items: AdminSidebarNavItem[];
    /** Subsections per section key, from `buildAdminNavTree`. */
    tree?: Record<string, AdminNavSubsection[]>;
    /** Omitted while the layout is restricted (#891) — see `AdminSidebarProps`. */
    account?: AdminSidebarNavItem;
    logout: { label: string; onLogout: () => void };
    currentPath: string;
}

const LOGOUT_KEY = 'logout';

/** Bottom bar: Home · Einstellen · Einladen · Mehr (ORISO-Admin#1323). */
const TAB_KEYS = ['home', 'theme', 'links'];

const subsectionLabel = (t: TFunction, subsection: AdminNavSubsection) =>
    String(t(subsection.labelKey, subsection.fallbackKey ? String(t(subsection.fallbackKey)) : undefined));

/**
 * Connects {@link AdminMobileNav} to the app: destinations from the same
 * builder the sidebar uses, subsections from `buildAdminNavTree`, back target
 * and page toolbar from whatever page is mounted (see {@link MobileNavContext}).
 *
 * The active destination is resolved by longest matching route, so
 * `/admin/tenants/7/legal-settings` still marks "Träger" rather than falling
 * back to nothing.
 */
export const AdminMobileNavBar = ({ account, currentPath, items, logout, tree = {} }: AdminMobileNavBarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const registration = useMobileNav();
    const adminSearch = useAdminSearch();

    const sections = useMemo<AdminMobileNavSection[]>(
        () =>
            items.map((item) => ({
                key: item.key,
                label: item.label,
                tabLabel: t(`mobileNav.tab.${item.key}`, { defaultValue: item.label }),
                to: item.to,
                description: t(`mobileNav.section.${item.key}.description`, { defaultValue: '' }) || undefined,
                icon: SECTION_GLYPHS[item.key] ? <NavGlyph name={SECTION_GLYPHS[item.key]} /> : undefined,
                subsections: (tree[item.key] ?? []).map((subsection) => ({
                    key: subsection.id,
                    label: subsectionLabel(t, subsection),
                    to: subsection.to,
                })),
            })),
        [items, t, tree],
    );

    const accountItems = useMemo<AdminMobileNavItem[]>(
        () => [
            ...(account
                ? [
                      {
                          key: account.key,
                          label: account.label,
                          to: account.to,
                          description: t('mobileNav.section.account.description', { defaultValue: '' }) || undefined,
                          icon: <NavGlyph name="profile" />,
                      },
                  ]
                : []),
            { key: LOGOUT_KEY, label: logout.label, icon: <NavGlyph name="logout" /> },
        ],
        [account, logout.label, t],
    );

    // Prefix match plus each item's `activeMatch`, so Users/Logs sibling hubs
    // still light the right section.
    const activeSectionKey = useMemo(
        () => resolveActiveNavKey(account ? [...items, account] : items, currentPath) ?? '',
        [account, currentPath, items],
    );

    // Longest subsection route that the current path is on.
    const activeSubsectionKey = useMemo(() => {
        const matches = (tree[activeSectionKey] ?? [])
            .filter((subsection) => currentPath === subsection.to || currentPath.startsWith(`${subsection.to}/`))
            .sort((a, b) => b.to.length - a.to.length);

        return matches[0]?.to ?? registration?.activeSubsectionKey;
    }, [activeSectionKey, currentPath, registration?.activeSubsectionKey, tree]);

    return (
        <AdminMobileNav
            className={styles.bar}
            sections={sections}
            accountItems={accountItems}
            activeSectionKey={activeSectionKey}
            activeSubsectionKey={activeSubsectionKey}
            onOpenGlobalSearch={adminSearch.available ? (trigger) => adminSearch.open(trigger) : undefined}
            searchOpen={adminSearch.isOpen}
            tabKeys={TAB_KEYS}
            onSectionSelect={(key) => {
                if (key === LOGOUT_KEY) {
                    logout.onLogout();
                }
            }}
            onBack={registration?.backPath ? () => navigate(registration.backPath as string) : undefined}
            onSearch={registration?.search?.onSearch}
            searchLabel={registration?.search?.label}
            searchPlaceholder={registration?.search?.placeholder}
            onAdd={registration?.add?.onAdd}
            addLabel={registration?.add?.label}
            labels={{
                navigation: t('mobileNav.navigation', 'Navigation'),
                more: t('mobileNav.more', 'Mehr'),
                globalSearch: t('mobileNav.search.label', 'Überall suchen'),
                close: t('mobileNav.close', 'Schließen'),
                back: registration?.backLabel ?? t('back', 'Zurück'),
            }}
        />
    );
};

export default AdminMobileNavBar;
