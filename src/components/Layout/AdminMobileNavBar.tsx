import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminMobileNav, type AdminMobileNavSection } from '../AdminMobileNav';
import { useMobileNav } from '../AdminMobileNav/MobileNavContext';
import { NavGlyph, type NavGlyphName } from '../NavGlyph';
import type { AdminSidebarNavItem } from './AdminSidebar';
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

    // Longest match wins: several destinations share a prefix, and an edit page
    // sits several segments below the section it belongs to.
    const activeSectionKey = useMemo(() => {
        const candidates = [...items, account]
            .filter((item) => currentPath === item.to || currentPath.startsWith(`${item.to}/`))
            .sort((a, b) => b.to.length - a.to.length);

        return candidates[0]?.key ?? '';
    }, [account, currentPath, items]);

    const activeSection = sections.find((section) => section.key === activeSectionKey);
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
            aria-label={activeSection?.label}
        />
    );
};

export default AdminMobileNavBar;
