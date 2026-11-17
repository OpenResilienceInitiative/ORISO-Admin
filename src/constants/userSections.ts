import routePathNames from '../appConfig';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import type { CanFn } from './caseHandoverAccess';

export type UserSection = {
    id: 'platform-admins' | 'statistics-readers' | 'tenant-admins' | 'agency-admins' | 'counsellors' | 'advice-seekers';
    labelKey: string;
    to: string;
};

/**
 * Account lists the admin may open, in display order. Shared by the desktop
 * pills (`UserSectionPills`) and the mobile menu (`adminNavTree`), so both
 * offer exactly the same lists per role.
 */
export const getUserSections = ({ isSuperAdmin, can }: { isSuperAdmin: boolean; can: CanFn }): UserSection[] => {
    const visible: UserSection[] = [];

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
    if (can(PermissionAction.Read, Resource.AdviceSeeker)) {
        visible.push({
            id: 'advice-seekers',
            labelKey: 'users.sectionPills.adviceSeekers',
            to: routePathNames.adviceSeekers,
        });
    }

    // ORISO-UserService#1666: read-only statistics accounts, managed by platform admins only.
    // Last, so this rarely used list never pushes the everyday lists behind „Mehr“.
    if (isSuperAdmin && can(PermissionAction.Read, Resource.StatisticsReaderUser)) {
        visible.push({
            id: 'statistics-readers',
            labelKey: 'users.sectionPills.statisticsReaders',
            to: routePathNames.statisticsReaders,
        });
    }

    return visible;
};
