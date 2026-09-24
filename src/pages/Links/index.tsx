import { useMemo } from 'react';
import classNames from 'classnames';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { M3Tooltip } from '../../components/M3Tooltip';
import { Page } from '../../components/Page';
import { useRegisterMobileNav } from '../../components/AdminMobileNav/MobileNavContext';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { type LinksTabKey, resolveVisibleLinksTabs } from '../../constants/linksAccess';
import routePathNames from '../../appConfig';
import pageStyles from '../../components/Page/styles.module.scss';
// The tab glyph is the ORISO icon-master link mark, not the generic permissions
// star that stood in for it: every tab here hands out an invite link.
import { ReactComponent as TabLinkIcon } from '../../resources/img/svg/oriso/link_24px.svg';
import styles from './styles.module.scss';

export { ExternalInboundsTab } from './ExternalInboundsTab';
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
    {
        key: 'external-inbounds',
        to: routePathNames.linksExternalInbounds,
        titleKey: 'links.tabs.externalInbounds',
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

    // Custom NavLink row keeps its own icon treatment on desktop; publish the
    // same destinations for the mobile chip row (Page.Title `tabs` would also
    // render PageTabs and double the desktop switcher).
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
                {isDesktopLayout && (
                    <div className={styles.pageHeader}>
                        <div className={pageStyles.tabsContainer}>
                            {LINK_TABS.map((tab) =>
                                navigableTabs.includes(tab) ? (
                                    <NavLink className={pageStyles.tab} to={tab.to} key={tab.key}>
                                        <TabLinkIcon className={pageStyles.tabStar} width={20} height={20} />
                                        <span className={pageStyles.tabLabel}>{t(tab.titleKey)}</span>
                                    </NavLink>
                                ) : (
                                    // Disable, don't hide: the admin sees the tab and why it is closed.
                                    <M3Tooltip
                                        key={tab.key}
                                        text={t('links.tabs.platformOnly', 'Nur Plattform-Admins')}
                                    >
                                        <span
                                            aria-disabled="true"
                                            className={classNames(pageStyles.tab, styles.tabDisabled)}
                                            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger on a disabled tab
                                            tabIndex={0}
                                        >
                                            <TabLinkIcon className={pageStyles.tabStar} width={20} height={20} />
                                            <span className={pageStyles.tabLabel}>{t(tab.titleKey)}</span>
                                        </span>
                                    </M3Tooltip>
                                ),
                            )}
                        </div>
                    </div>
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
