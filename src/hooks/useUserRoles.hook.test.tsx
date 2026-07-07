import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { useUserRoles } from './useUserRoles.hook';

const mocks = vi.hoisted(() => ({
    getAccessTokenForRequests: vi.fn(),
    parseJwt: vi.fn(),
}));

vi.mock('../api/auth/auth', () => ({
    getAccessTokenForRequests: mocks.getAccessTokenForRequests,
}));

vi.mock('../utils/parseJWT', () => ({
    default: mocks.parseJwt,
}));

const UserRolesHarness = () => {
    const roles = useUserRoles();

    return (
        <>
            <output aria-label="roles">{roles.roles.join(',')}</output>
            <output aria-label="tenant-id">{String(roles.tenantId)}</output>
            <output aria-label="super-admin">{String(roles.isSuperAdmin)}</output>
            <output aria-label="tenant-scoped">{String(roles.isTenantScopedAdmin)}</output>
            <output aria-label="technical">{String(roles.isTechnicalAccount)}</output>
            <output aria-label="has-admin-role">
                {String(roles.hasRole([UserRole.AgencyAdmin, UserRole.UserAdmin]))}
            </output>
        </>
    );
};

describe('useUserRoles', () => {
    beforeEach(() => {
        mocks.getAccessTokenForRequests.mockReset();
        mocks.parseJwt.mockReset();
    });

    it('returns no roles when no access token is available', () => {
        mocks.getAccessTokenForRequests.mockReturnValue('');

        render(<UserRolesHarness />);

        expect(screen.getByLabelText('roles')).toHaveTextContent('');
        expect(screen.getByLabelText('tenant-id')).toHaveTextContent('null');
        expect(screen.getByLabelText('super-admin')).toHaveTextContent('false');
    });

    it('detects global super admins and technical accounts from token claims', () => {
        mocks.getAccessTokenForRequests.mockReturnValue('token');
        mocks.parseJwt.mockReturnValue({
            tenantId: 0,
            realm_access: {
                roles: [UserRole.AgencyAdmin, UserRole.TenantAdmin, UserRole.Technical],
            },
        });

        render(<UserRolesHarness />);

        expect(screen.getByLabelText('roles')).toHaveTextContent('agency-admin,tenant-admin,technical');
        expect(screen.getByLabelText('tenant-id')).toHaveTextContent('0');
        expect(screen.getByLabelText('super-admin')).toHaveTextContent('true');
        expect(screen.getByLabelText('technical')).toHaveTextContent('true');
        expect(screen.getByLabelText('has-admin-role')).toHaveTextContent('true');
    });

    it('detects tenant scoped admins from string tenant ids', () => {
        mocks.getAccessTokenForRequests.mockReturnValue('token');
        mocks.parseJwt.mockReturnValue({
            tenantId: '42',
            realm_access: {
                roles: [UserRole.TenantAdmin],
            },
        });

        render(<UserRolesHarness />);

        expect(screen.getByLabelText('tenant-id')).toHaveTextContent('42');
        expect(screen.getByLabelText('tenant-scoped')).toHaveTextContent('true');
        expect(screen.getByLabelText('super-admin')).toHaveTextContent('false');
    });
});
