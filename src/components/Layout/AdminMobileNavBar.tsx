import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminMobileNav, type AdminMobileNavSection } from '../AdminMobileNav';
import { useMobileNav } from '../AdminMobileNav/MobileNavContext';
import { NavGlyph, type NavGlyphName } from '../NavGlyph';
import type { AdminSidebarNavItem } from './AdminSidebar';
import { resolveActiveNavKey } from './resolveActiveNavKey';
import styles from './adminMobileNavBar.module.scss';

/**
 * Glyph per nav item, keyed by the item's stable `key` rather than its route:
 * the settings entry alone resolves to five different paths depending on role,
 * the key does not.
 */
const SECTION_GLYPHS: Record<string, NavGlyphName> = {
    theme: 'displaySettings',
    tenants: 'tenants',
    agency: 'counseling',
    counselors: 'users',
    statistics: 'statistics',
    links: 'links',
    logs: 'logs',
    'activity-logs': 'logs',
    account: 'profile',
};

export interface AdminMobileNavBarProps {
    /** The same resolved destinations the sidebar gets. */
    items: AdminSidebarNavItem[];
    account: AdminSidebarNavItem;
    logout: { label: string; onLogout: () => void };
    currentPath: string;
}

const LOGOUT_KEY = 'logout';

/**
 * Connects {@link AdminMobileNav} to the app: destinations from the same
 * builder the sidebar uses, subsections and back target from whatever page is
 * mounted (see {@link MobileNavContext}).
 *
 * The active destination is resolved by longest matching route, so
 * `/admin/tenants/7/legal-settings` still marks "Träger" rather than falling
 * back to nothing.
 */
export const AdminMobileNavBar = ({ account, currentPath, items, logout }: AdminMobileNavBarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const registration = useMobileNav();

    const sections = useMemo<AdminMobileNavSection[]>(
        () =>
            items.map((item) => ({
                key: item.key,
                label: item.label,
                to: item.to,
                icon: SECTION_GLYPHS[item.key] ? <NavGlyph name={SECTION_GLYPHS[item.key]} /> : undefined,
            })),
        [items],
    );

    const accountItems = useMemo(
        () => [
            { key: account.key, label: account.label, to: account.to, icon: <NavGlyph name="profile" /> },
            { key: LOGOUT_KEY, label: logout.label, icon: <NavGlyph name="logout" /> },
        ],
        [account, logout.label],
    );

    // Same resolver the deleted bottom nav used: prefix match plus each item's
    // `activeMatch`, so Users/Logs sibling hubs still light the right section.
    const activeSectionKey = useMemo(
        () => resolveActiveNavKey([...items, account], currentPath) ?? '',
        [account, currentPath, items],
    );

    const sectionsWithSubsections = useMemo(
        () =>
            sections.map((section) =>
                section.key === activeSectionKey ? { ...section, subsections: registration?.subsections } : section,
            ),
        [activeSectionKey, registration?.subsections, sections],
    );

    return (
        <AdminMobileNav
            className={styles.bar}
            sections={sectionsWithSubsections}
            accountItems={accountItems}
            activeSectionKey={activeSectionKey}
            activeSubsectionKey={registration?.activeSubsectionKey}
            onSectionSelect={(key) => {
                if (key === LOGOUT_KEY) {
                    logout.onLogout();
                }
            }}
            onBack={registration?.backPath ? () => navigate(registration.backPath as string) : undefined}
            backLabel={registration?.backLabel ?? t('back', 'Zurück')}
            onSearch={registration?.search?.onSearch}
            searchLabel={registration?.search?.label}
            searchPlaceholder={registration?.search?.placeholder}
            onAdd={registration?.add?.onAdd}
            addLabel={registration?.add?.label}
            openLabel={t('sidebar.menu.open', 'Menü öffnen')}
            closeLabel={t('sidebar.menu.close', 'Menü schließen')}
        />
    );
};

export default AdminMobileNavBar;
