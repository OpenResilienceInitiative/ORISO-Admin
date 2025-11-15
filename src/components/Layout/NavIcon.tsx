import { useLocation } from 'react-router';
import { useState } from 'react';
import routePathNames from '../../appConfig';
import { ReactComponent as SettingsActiveIcon } from '../../resources/img/svg/navbar/settings_active.svg';
import { ReactComponent as SettingsInactiveIcon } from '../../resources/img/svg/navbar/settings_inactive.svg';
import { ReactComponent as TenantsActiveIcon } from '../../resources/img/svg/navbar/tenants_active.svg';
import { ReactComponent as TenantsInactiveIcon } from '../../resources/img/svg/navbar/tenants_inactive.svg';
import { ReactComponent as CounselingActiveIcon } from '../../resources/img/svg/navbar/counseling_active.svg';
import { ReactComponent as CounselingInactiveIcon } from '../../resources/img/svg/navbar/counseling_inactive.svg';
import { ReactComponent as UsersActiveIcon } from '../../resources/img/svg/navbar/users_active.svg';
import { ReactComponent as UsersInactiveIcon } from '../../resources/img/svg/navbar/users_inactive.svg';
import { ReactComponent as ProfileActiveIcon } from '../../resources/img/svg/navbar/profile_active.svg';
import { ReactComponent as ProfileInactiveIcon } from '../../resources/img/svg/navbar/profile_inactive.svg';
import { ReactComponent as TopicsActiveIcon } from '../../resources/img/svg/navbar/topics_active.svg';
import { ReactComponent as TopicsInactiveIcon } from '../../resources/img/svg/navbar/topics_inactive.svg';
import { ReactComponent as StatisticsActiveIcon } from '../../resources/img/svg/navbar/statistics_active.svg';
import { ReactComponent as StatisticsInactiveIcon } from '../../resources/img/svg/navbar/statistics_inactive.svg';
import { ReactComponent as LogoutActiveIcon } from '../../resources/img/svg/navbar/logout_active.svg';
import { ReactComponent as LogoutInactiveIcon } from '../../resources/img/svg/navbar/logout_inactive.svg';

interface Props {
    path: string;
}

const Icon = ({ path, hover }: { path: string; hover: boolean }) => {
    const currentPath = useLocation().pathname;
    const currentlySelected = hover || currentPath.includes(path);

    switch (path) {
        case routePathNames.themeSettings:
            return currentlySelected ? <SettingsActiveIcon /> : <SettingsInactiveIcon />;
        case '/admin/users':
            return currentlySelected ? <UsersActiveIcon /> : <UsersInactiveIcon />;
        case '/admin/tenants':
            return currentlySelected ? <TenantsActiveIcon /> : <TenantsInactiveIcon />;
        case routePathNames.agency:
        case routePathNames.agencyAdd:
        case routePathNames.agencyAddGeneral:
        case routePathNames.agencyEdit:
        case routePathNames.agencyEditInitialMeeting:
            return currentlySelected ? <CounselingActiveIcon /> : <CounselingInactiveIcon />;
        case routePathNames.topics:
            return currentlySelected ? <TopicsActiveIcon /> : <TopicsInactiveIcon />;
        case routePathNames.statistic:
            return currentlySelected ? <StatisticsActiveIcon /> : <StatisticsInactiveIcon />;
        case routePathNames.userProfile:
            return currentlySelected ? <ProfileActiveIcon /> : <ProfileInactiveIcon />;
        case 'logout':
            return currentlySelected ? <LogoutActiveIcon /> : <LogoutInactiveIcon />;
        default:
            return <div />;
    }
};

export const NavIcon = ({ path }: Props) => {
    const [hover, setHover] = useState(false);

    return (
        <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <Icon path={path} hover={hover} />
        </div>
    );
};
