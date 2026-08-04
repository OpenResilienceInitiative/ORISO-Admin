import { useLocation } from 'react-router-dom';
import { cloneElement, useState, type JSX } from 'react';
import routePathNames from '../../appConfig';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { ReactComponent as DisplaySettingsActiveIcon } from '../../resources/img/svg/navbar/display_settings_active.svg';
import { ReactComponent as DisplaySettingsHoverIcon } from '../../resources/img/svg/navbar/display_settings_hover.svg';
import { ReactComponent as DisplaySettingsInactiveIcon } from '../../resources/img/svg/navbar/display_settings_inactive.svg';
import { ReactComponent as SettingsActiveIcon } from '../../resources/img/svg/navbar/settings_active.svg';
import { ReactComponent as SettingsHoverIcon } from '../../resources/img/svg/navbar/settings_hover.svg';
import { ReactComponent as SettingsInactiveIcon } from '../../resources/img/svg/navbar/settings_inactive.svg';
import { ReactComponent as TenantsActiveIcon } from '../../resources/img/svg/navbar/tenants_active.svg';
import { ReactComponent as TenantsHoverIcon } from '../../resources/img/svg/navbar/tenants_hover.svg';
import { ReactComponent as TenantsInactiveIcon } from '../../resources/img/svg/navbar/tenants_inactive.svg';
import { ReactComponent as CounselingActiveIcon } from '../../resources/img/svg/navbar/counseling_active.svg';
import { ReactComponent as CounselingHoverIcon } from '../../resources/img/svg/navbar/counseling_hover.svg';
import { ReactComponent as CounselingInactiveIcon } from '../../resources/img/svg/navbar/counseling_inactive.svg';
import { ReactComponent as UsersActiveIcon } from '../../resources/img/svg/navbar/users_active.svg';
import { ReactComponent as UsersHoverIcon } from '../../resources/img/svg/navbar/users_hover.svg';
import { ReactComponent as UsersInactiveIcon } from '../../resources/img/svg/navbar/users_inactive.svg';
import { ReactComponent as ProfileActiveIcon } from '../../resources/img/svg/navbar/profile_active.svg';
import { ReactComponent as ProfileHoverIcon } from '../../resources/img/svg/navbar/profile_hover.svg';
import { ReactComponent as ProfileInactiveIcon } from '../../resources/img/svg/navbar/profile_inactive.svg';
import { ReactComponent as TopicsActiveIcon } from '../../resources/img/svg/navbar/topics_active.svg';
import { ReactComponent as TopicsInactiveIcon } from '../../resources/img/svg/navbar/topics_inactive.svg';
import { ReactComponent as StatisticsActiveIcon } from '../../resources/img/svg/navbar/statistics_active.svg';
import { ReactComponent as StatisticsHoverIcon } from '../../resources/img/svg/navbar/statistics_hover.svg';
import { ReactComponent as StatisticsInactiveIcon } from '../../resources/img/svg/navbar/statistics_inactive.svg';
import { ReactComponent as LinksActiveIcon } from '../../resources/img/svg/navbar/links_active.svg';
import { ReactComponent as LinksHoverIcon } from '../../resources/img/svg/navbar/links_hover.svg';
import { ReactComponent as LinksInactiveIcon } from '../../resources/img/svg/navbar/links_inactive.svg';
import { ReactComponent as LogsActiveIcon } from '../../resources/img/svg/navbar/logs_active.svg';
import { ReactComponent as LogsHoverIcon } from '../../resources/img/svg/navbar/logs_hover.svg';
import { ReactComponent as LogsInactiveIcon } from '../../resources/img/svg/navbar/logs_inactive.svg';
import { ReactComponent as LogoutActiveIcon } from '../../resources/img/svg/navbar/logout_active.svg';
import { ReactComponent as LogoutHoverIcon } from '../../resources/img/svg/navbar/logout_hover.svg';
import { ReactComponent as LogoutInactiveIcon } from '../../resources/img/svg/navbar/logout_inactive.svg';

interface Props {
    path: string;
}

type IconState = 'active' | 'hover' | 'inactive';

const decorateIcon = (icon: JSX.Element) =>
    cloneElement(icon, {
        'aria-hidden': true,
        focusable: 'false',
        role: 'presentation',
    });

const selectIcon = (state: IconState, icons: Record<IconState, JSX.Element>) => decorateIcon(icons[state]);

const getIconState = (isActive: boolean, hover: boolean): IconState => {
    if (isActive) {
        return 'active';
    }
    if (hover) {
        return 'hover';
    }
    return 'inactive';
};

const isCurrentPathActive = (currentPath: string, path: string): boolean =>
    currentPath === path || currentPath.startsWith(`${path}/`);

const Icon = ({ path, hover }: { path: string; hover: boolean }) => {
    const currentPath = useLocation().pathname;
    const isActivePath = isCurrentPathActive(currentPath, path);
    const isDesktopSidebar = useIsDesktopLayout();
    const iconState = getIconState(isActivePath && isDesktopSidebar, hover);

    switch (path) {
        case routePathNames.themeSettings:
            return selectIcon(iconState, {
                active: <DisplaySettingsActiveIcon />,
                hover: <DisplaySettingsHoverIcon />,
                inactive: <DisplaySettingsInactiveIcon />,
            });
        case routePathNames.globalSettings:
            return selectIcon(iconState, {
                active: <SettingsActiveIcon />,
                hover: <SettingsHoverIcon />,
                inactive: <SettingsInactiveIcon />,
            });
        case '/admin/users':
            return selectIcon(iconState, {
                active: <UsersActiveIcon />,
                hover: <UsersHoverIcon />,
                inactive: <UsersInactiveIcon />,
            });
        case '/admin/tenants':
            return selectIcon(iconState, {
                active: <TenantsActiveIcon />,
                hover: <TenantsHoverIcon />,
                inactive: <TenantsInactiveIcon />,
            });
        case routePathNames.agency:
        case routePathNames.agencyAdd:
        case routePathNames.agencyAddGeneral:
        case routePathNames.agencyEdit:
            return selectIcon(iconState, {
                active: <CounselingActiveIcon />,
                hover: <CounselingHoverIcon />,
                inactive: <CounselingInactiveIcon />,
            });
        case routePathNames.topics:
            return decorateIcon(iconState === 'inactive' ? <TopicsInactiveIcon /> : <TopicsActiveIcon />);
        case routePathNames.statistic:
            return selectIcon(iconState, {
                active: <StatisticsActiveIcon />,
                hover: <StatisticsHoverIcon />,
                inactive: <StatisticsInactiveIcon />,
            });
        case routePathNames.logs:
        case routePathNames.caseHandoverLogs:
        case routePathNames.inactiveAccountAuditLogs:
            return selectIcon(iconState, {
                active: <LogsActiveIcon />,
                hover: <LogsHoverIcon />,
                inactive: <LogsInactiveIcon />,
            });
        case routePathNames.links:
            return selectIcon(iconState, {
                active: <LinksActiveIcon />,
                hover: <LinksHoverIcon />,
                inactive: <LinksInactiveIcon />,
            });
        case routePathNames.linksTenants:
        case routePathNames.linksCounsellor:
        case routePathNames.linksExternalInbounds:
            return selectIcon(iconState, {
                active: <LinksActiveIcon />,
                hover: <LinksHoverIcon />,
                inactive: <LinksInactiveIcon />,
            });
        case routePathNames.userProfile:
            return selectIcon(iconState, {
                active: <ProfileActiveIcon />,
                hover: <ProfileHoverIcon />,
                inactive: <ProfileInactiveIcon />,
            });
        case 'logout':
            return selectIcon(iconState, {
                active: <LogoutActiveIcon />,
                hover: <LogoutHoverIcon />,
                inactive: <LogoutInactiveIcon />,
            });
        default:
            return <div aria-hidden="true" />;
    }
};

export const NavIcon = ({ path }: Props) => {
    const [hover, setHover] = useState(false);

    return (
        <div aria-hidden="true" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <Icon path={path} hover={hover} />
        </div>
    );
};
