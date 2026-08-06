import classNames from 'classnames';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
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

    return (
        <Page>
            <Page.Title>
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
            </Page.Title>
            <Outlet />
        </Page>
    );
};

export const LinksIndexRedirect = () => <Navigate to={routePathNames.linksTenants} replace />;
