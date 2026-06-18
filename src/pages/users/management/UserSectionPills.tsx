import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../../appConfig';
import { AdminSegmentedTabs, AdminSegmentedTabItem } from '../../../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { useUserPermissions } from '../../../hooks/useUserPermission';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { ReactComponent as AllUsersFilledIcon } from '../../../resources/img/svg/user-management/all_users_filled.svg';
import { ReactComponent as AllUsersIcon } from '../../../resources/img/svg/user-management/all_users.svg';
import styles from './UserSectionPills.module.scss';

type SectionPill = {
    id: string;
    labelKey: string;
    to?: string;
    disabled?: boolean;
};

export const UserSectionPills = () => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();

    const pills = useMemo(() => {
        const visible: SectionPill[] = [];

        if (isSuperAdmin) {
            visible.push({
                id: 'platform-admins',
                labelKey: 'users.sectionPills.platformAdmins',
                to: routePathNames.platformAdmins,
            });
        }

        if (can(PermissionAction.Read, Resource.TenantAdminUser)) {
            visible.push({
                id: 'tenant-admins',
                labelKey: 'users.sectionPills.tenantAdmins',
                to: routePathNames.tenantAdmins,
            });
        }

        if (can(PermissionAction.Read, Resource.AgencyAdminUser)) {
            visible.push({
                id: 'agency-admins',
                labelKey: 'users.sectionPills.counsellorAdmins',
                to: routePathNames.agencyAdmins,
            });
        }

        if (can(PermissionAction.Read, Resource.Consultant)) {
            visible.push({
                id: 'counsellors',
                labelKey: 'users.sectionPills.counsellors',
                to: routePathNames.consultants,
            });
        }

        return visible;
    }, [can, isSuperAdmin]);

    const navigablePills = pills.filter((pill) => pill.to && !pill.disabled);

    if (navigablePills.length === 0) {
        return null;
    }

    const tabItems: AdminSegmentedTabItem[] = pills.map((pill) => ({
        id: pill.id,
        label: t(pill.labelKey),
        to: pill.to,
        disabled: pill.disabled,
        icon: <AllUsersIcon />,
        activeIcon: <AllUsersFilledIcon />,
    }));

    return <AdminSegmentedTabs className={styles.container} items={tabItems} ariaLabel={t('users.allUsers')} />;
};
