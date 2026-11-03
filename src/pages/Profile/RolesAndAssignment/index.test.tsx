import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../enums/UserRole';
import { RolesAndAssignment } from './index';

const useUserRoles = vi.fn();
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => useUserRoles() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('RolesAndAssignment', () => {
    it('lists the known roles and hides technical ones', () => {
        useUserRoles.mockReturnValue({
            roles: [UserRole.AgencyAdmin, 'consultant', UserRole.Technical],
            isSuperAdmin: false,
        });
        render(<RolesAndAssignment />);

        expect(screen.getByText('profile.roles.role.agencyAdmin')).toBeTruthy();
        expect(screen.getByText('profile.roles.role.consultant')).toBeTruthy();
        expect(screen.queryByText('profile.roles.role.technical')).toBeNull();
    });

    it('shows the platform admin label instead of the raw role list for super admins', () => {
        useUserRoles.mockReturnValue({
            roles: [UserRole.AgencyAdmin, UserRole.TenantAdmin],
            isSuperAdmin: true,
        });
        render(<RolesAndAssignment />);

        expect(screen.getByText('profile.roles.role.platformAdmin')).toBeTruthy();
        expect(screen.queryByText('profile.roles.role.tenantAdmin')).toBeNull();
    });

    it('shows an empty note when no role can be displayed', () => {
        useUserRoles.mockReturnValue({ roles: [UserRole.Technical], isSuperAdmin: false });
        render(<RolesAndAssignment />);

        expect(screen.getByText('profile.roles.empty')).toBeTruthy();
    });
});
