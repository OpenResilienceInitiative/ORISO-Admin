import { PersonOutline } from '@mui/icons-material';
import classNames from 'classnames';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import routePathNames from '../../appConfig';
import pageStyles from '../../components/Page/styles.module.scss';
import { ReactComponent as TabStarIcon } from '../../resources/img/svg/permissions/tab_star.svg';
import styles from './styles.module.scss';

export { ExternalInboundsTab } from './ExternalInboundsTab';
export { TenantsInvitesTab } from './TenantsInvitesTab';
export { CounsellorInvitesTab } from './CounsellorInvitesTab';

const INVITE_LINK_TABS = [
    {
        to: routePathNames.inviteLinksTenants,
        titleKey: 'inviteLinks.tabs.tenants',
        disabled: true,
    },
    {
        to: routePathNames.inviteLinksCounsellor,
        titleKey: 'inviteLinks.tabs.counsellor',
        disabled: true,
    },
    {
        to: routePathNames.inviteLinksExternalInbounds,
        titleKey: 'inviteLinks.tabs.externalInbounds',
        disabled: false,
    },
] as const;

export const InviteLinksPage = () => {
    const { t } = useTranslation();

    return (
        <Page>
            <div className={styles.pageHeader}>
                <div className={pageStyles.tabsContainer}>
                    {INVITE_LINK_TABS.map((tab) =>
                        tab.disabled ? (
                            <span
                                className={classNames(pageStyles.tab, styles.tabDisabled)}
                                key={tab.titleKey}
                                aria-disabled="true"
                            >
                                <TabStarIcon className={pageStyles.tabStar} width={20} height={20} />
                                <span className={pageStyles.tabLabel}>{t(tab.titleKey)}</span>
                            </span>
                        ) : (
                            <NavLink className={pageStyles.tab} to={tab.to} key={tab.titleKey}>
                                <TabStarIcon className={pageStyles.tabStar} width={20} height={20} />
                                <span className={pageStyles.tabLabel}>{t(tab.titleKey)}</span>
                            </NavLink>
                        ),
                    )}
                </div>
                <NavLink to={routePathNames.userProfile} className={styles.myAccessButton}>
                    <PersonOutline />
                    <span>{t('inviteLinks.myAccess', 'Mein Zugang')}</span>
                </NavLink>
            </div>
            <Outlet />
        </Page>
    );
};

export const InviteLinksIndexRedirect = () => (
    <Navigate to={routePathNames.inviteLinksExternalInbounds} replace />
);
