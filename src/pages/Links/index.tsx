import { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import { useRegisterMobileNav } from '../../components/AdminMobileNav/MobileNavContext';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { type LinksTabKey, resolveVisibleLinksTabs } from '../../constants/linksAccess';
import routePathNames from '../../appConfig';
import { AdminSegmentedTabs } from '../../components/AdminSegmentedTabs/AdminSegmentedTabs';
// The tab glyph is the ORISO icon-master link mark, not the generic permissions
// star that stood in for it: every tab here hands out an invite link.
import { ReactComponent as TabLinkIcon } from '../../resources/img/svg/oriso/link_24px.svg';

export { CounsellorInvitesTab, TenantInvitesTab } from './AccountInvitesTab';

const LINK_TABS: ReadonlyArray<{ key: LinksTabKey; to: string; titleKey: string }> = [
    {
        key: 'tenants',
        to: routePathNames.linksTenants,
        titleKey: 'links.tabs.tenants',
    },
    {
        key: 'counsellor',
        to: routePathNames.linksCounsellor,
        titleKey: 'links.tabs.counsellor',
    },
];

/** Tabs the signed-in admin may open (see `linksAccess.ts`). */
const useVisibleLinkTabs = () => {
    const { isSuperAdmin, hasRole } = useUserRoles();
    return useMemo(() => {
        const visible = resolveVisibleLinksTabs({ isSuperAdmin, hasRole });
        return LINK_TABS.filter((tab) => visible.includes(tab.key));
    }, [isSuperAdmin, hasRole]);
};

export const LinksPage = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isDesktopLayout = useIsDesktopLayout();

    const navigableTabs = useVisibleLinkTabs();

    const activeSubsectionKey = useMemo(() => {
        const matches = navigableTabs
            .filter((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))
            .sort((a, b) => b.to.length - a.to.length);

        return matches[0]?.to;
    }, [navigableTabs, pathname]);

    // The desktop bar carries the link glyph (Page.Title `tabs` would fall back
    // to the generic star); publish the same destinations for the mobile chip row.
    useRegisterMobileNav(
        'links-sections',
        navigableTabs.length > 1
            ? {
                  subsections: navigableTabs.map((tab) => ({
                      key: tab.to,
                      label: String(t(tab.titleKey)),
                      to: tab.to,
                  })),
                  activeSubsectionKey,
              }
            : null,
    );

    return (
        <Page>
            <Page.Title>
                {isDesktopLayout && navigableTabs.length > 0 && (
                    <AdminSegmentedTabs
                        ariaLabel={String(t('links.navTitle'))}
                        items={navigableTabs.map((tab) => ({
                            id: tab.key,
                            label: String(t(tab.titleKey)),
                            to: tab.to,
                            icon: <TabLinkIcon />,
                        }))}
                    />
                )}
            </Page.Title>
            <Outlet />
        </Page>
    );
};

/** `/admin/links` lands on the first tab the admin may see. */
export const LinksIndexRedirect = () => {
    const [firstTab] = useVisibleLinkTabs();
    return <Navigate to={firstTab?.to ?? routePathNames.root} replace />;
};
