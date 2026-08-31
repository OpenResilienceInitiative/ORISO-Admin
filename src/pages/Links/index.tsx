import classNames from 'classnames';
import { useMemo } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import { useRegisterMobileNav } from '../../components/AdminMobileNav/MobileNavContext';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import routePathNames from '../../appConfig';
import pageStyles from '../../components/Page/styles.module.scss';
// The tab glyph is the ORISO icon-master link mark, not the generic permissions
// star that stood in for it: every tab here hands out an invite link.
import { ReactComponent as TabLinkIcon } from '../../resources/img/svg/oriso/link_24px.svg';
import styles from './styles.module.scss';

export { ExternalInboundsTab } from './ExternalInboundsTab';
export { CounsellorInvitesTab, TenantInvitesTab } from './AccountInvitesTab';

const LINK_TABS = [
    {
        to: routePathNames.linksTenants,
        titleKey: 'links.tabs.tenants',
        disabled: false,
    },
    {
        to: routePathNames.linksCounsellor,
        titleKey: 'links.tabs.counsellor',
        disabled: false,
    },
    {
        to: routePathNames.linksExternalInbounds,
        titleKey: 'links.tabs.externalInbounds',
        disabled: false,
    },
] as const;

export const LinksPage = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isDesktopLayout = useIsDesktopLayout();

    const navigableTabs = useMemo(() => LINK_TABS.filter((tab) => !tab.disabled), []);

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
                                tab.disabled ? (
                                    <span
                                        className={classNames(pageStyles.tab, styles.tabDisabled)}
                                        key={tab.titleKey}
                                        aria-disabled="true"
                                    >
                                        <TabLinkIcon className={pageStyles.tabStar} width={20} height={20} />
                                        <span className={pageStyles.tabLabel}>{t(tab.titleKey)}</span>
                                    </span>
                                ) : (
                                    <NavLink className={pageStyles.tab} to={tab.to} key={tab.titleKey}>
                                        <TabLinkIcon className={pageStyles.tabStar} width={20} height={20} />
                                        <span className={pageStyles.tabLabel}>{t(tab.titleKey)}</span>
                                    </NavLink>
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

export const LinksIndexRedirect = () => <Navigate to={routePathNames.linksTenants} replace />;
