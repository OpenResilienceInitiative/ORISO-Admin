import { useLocation } from 'react-router-dom';
import { cloneElement, useState, type ComponentType, type JSX, type SVGProps } from 'react';
import routePathNames from '../../appConfig';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { ReactComponent as HomeActiveIcon } from '../../resources/img/svg/navbar/home_active.svg';
import { ReactComponent as HomeHoverIcon } from '../../resources/img/svg/navbar/home_hover.svg';
import { ReactComponent as HomeInactiveIcon } from '../../resources/img/svg/navbar/home_inactive.svg';
import { ReactComponent as DisplaySettingsActiveIcon } from '../../resources/img/svg/navbar/display_settings_active.svg';
import { ReactComponent as DisplaySettingsHoverIcon } from '../../resources/img/svg/navbar/display_settings_hover.svg';
import { ReactComponent as DisplaySettingsInactiveIcon } from '../../resources/img/svg/navbar/display_settings_inactive.svg';
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
import { ReactComponent as InviteActiveIcon } from '../../resources/img/svg/navbar/invite_active.svg';
import { ReactComponent as InviteHoverIcon } from '../../resources/img/svg/navbar/invite_hover.svg';
import { ReactComponent as InviteInactiveIcon } from '../../resources/img/svg/navbar/invite_inactive.svg';
import { ReactComponent as LogsActiveIcon } from '../../resources/img/svg/navbar/logs_active.svg';
import { ReactComponent as LogsHoverIcon } from '../../resources/img/svg/navbar/logs_hover.svg';
import { ReactComponent as LogsInactiveIcon } from '../../resources/img/svg/navbar/logs_inactive.svg';
import { ReactComponent as AddonsActiveIcon } from '../../resources/img/svg/navbar/settings_active.svg';
import { ReactComponent as AddonsHoverIcon } from '../../resources/img/svg/navbar/settings_hover.svg';
import { ReactComponent as AddonsInactiveIcon } from '../../resources/img/svg/navbar/settings_inactive.svg';
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

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type IconSet = Record<IconState, IconComponent>;

/** Topics ships no hover variant: it shows the active glyph on hover. */
const withoutHover = (active: IconComponent, inactive: IconComponent): IconSet => ({
    active,
    hover: active,
    inactive,
});

/**
 * The glyphs the navigation shows for `path` (an `AdminSidebarNavItem.iconPath`), or null for an
 * unknown path. Pure, so the browser tab (SectionTabIdentity) can draw the very glyph the sidebar
 * shows for the active section without rendering the sidebar.
 */
export const navIconSetFor = (path: string): IconSet | null => {
    switch (path) {
        case routePathNames.home:
            return { active: HomeActiveIcon, hover: HomeHoverIcon, inactive: HomeInactiveIcon };
        case routePathNames.themeSettings:
            return {
                active: DisplaySettingsActiveIcon,
                hover: DisplaySettingsHoverIcon,
                inactive: DisplaySettingsInactiveIcon,
            };
        case '/admin/users':
            return { active: UsersActiveIcon, hover: UsersHoverIcon, inactive: UsersInactiveIcon };
        case '/admin/tenants':
            return { active: TenantsActiveIcon, hover: TenantsHoverIcon, inactive: TenantsInactiveIcon };
        case routePathNames.agency:
        case routePathNames.agencyAdd:
        case routePathNames.agencyAddGeneral:
        case routePathNames.agencyEdit:
            return { active: CounselingActiveIcon, hover: CounselingHoverIcon, inactive: CounselingInactiveIcon };
        case routePathNames.topics:
            return withoutHover(TopicsActiveIcon, TopicsInactiveIcon);
        case routePathNames.statistic:
            return { active: StatisticsActiveIcon, hover: StatisticsHoverIcon, inactive: StatisticsInactiveIcon };
        case routePathNames.logs:
        case routePathNames.caseHandoverLogs:
        case routePathNames.inactiveAccountAuditLogs:
        case routePathNames.deletionAuditLogs:
        case routePathNames.addonAuditLogs:
            return { active: LogsActiveIcon, hover: LogsHoverIcon, inactive: LogsInactiveIcon };
        // The invite area: an envelope, since inviting means sending a mail (#1374).
        case routePathNames.links:
        case routePathNames.linksTenants:
        case routePathNames.linksCounsellor:
            return { active: InviteActiveIcon, hover: InviteHoverIcon, inactive: InviteInactiveIcon };
        case routePathNames.addons:
            return { active: AddonsActiveIcon, hover: AddonsHoverIcon, inactive: AddonsInactiveIcon };
        case routePathNames.userProfile:
            return { active: ProfileActiveIcon, hover: ProfileHoverIcon, inactive: ProfileInactiveIcon };
        case 'logout':
            return { active: LogoutActiveIcon, hover: LogoutHoverIcon, inactive: LogoutInactiveIcon };
        default:
            return null;
    }
};

/** The glyph the navigation shows for `path` while its section is active. */
export const activeNavIconFor = (path: string): IconComponent | null => navIconSetFor(path)?.active ?? null;

const Icon = ({ path, hover }: { path: string; hover: boolean }) => {
    const currentPath = useLocation().pathname;
    const isActivePath = isCurrentPathActive(currentPath, path);
    const isDesktopSidebar = useIsDesktopLayout();
    const iconState = getIconState(isActivePath && isDesktopSidebar, hover);
    const icons = navIconSetFor(path);

    if (!icons) {
        return <div aria-hidden="true" />;
    }
    const Glyph = icons[iconState];
    return decorateIcon(<Glyph />);
};

export const NavIcon = ({ path }: Props) => {
    const [hover, setHover] = useState(false);

    return (
        <div aria-hidden="true" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <Icon path={path} hover={hover} />
        </div>
    );
};
