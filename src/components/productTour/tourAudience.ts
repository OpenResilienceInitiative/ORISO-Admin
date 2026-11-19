import { UserRole } from '../../enums/UserRole';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import type { TourAudience, TourDefinition } from './types';

/** Admin tour audience of the signed-in account (platform > tenant > agency admin). */
export const resolveTourAudience = (
    isSuperAdmin: boolean,
    hasRole: (role: UserRole | UserRole[]) => boolean,
): TourAudience => {
    if (isSuperAdmin) {
        return 'platform_admin';
    }
    if (hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin])) {
        return 'tenant_admin';
    }
    return 'agency_admin';
};

export const useTourAudience = (): TourAudience => {
    const { hasRole, isSuperAdmin } = useUserRoles();
    return resolveTourAudience(isSuperAdmin, hasRole);
};

export const toursForAudience = (tours: TourDefinition[], audience: TourAudience): TourDefinition[] =>
    tours.filter((tour) => tour.surface === 'admin' && tour.audiences.includes(audience));
