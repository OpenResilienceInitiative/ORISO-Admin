import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { useUserPermissions } from './useUserPermission';

vi.mock('../constants/userRolesToPermissions', () => ({
    useUserRolesToPermission: () => ({
        Tenant: { read: true, update: false },
        LegalText: { update: true },
    }),
}));

const PermissionsHarness = () => {
    const { permissions, can } = useUserPermissions();

    return (
        <>
            <output aria-label="tenant-read">{String(can(PermissionAction.Read, Resource.Tenant))}</output>
            <output aria-label="tenant-update">{String(can(PermissionAction.Update, Resource.Tenant))}</output>
            <output aria-label="any-tenant-action">
                {String(can([PermissionAction.Update, PermissionAction.Read], Resource.Tenant))}
            </output>
            <output aria-label="missing-resource">{String(can(PermissionAction.Read, Resource.Agency))}</output>
            <output aria-label="permissions">{JSON.stringify(permissions)}</output>
        </>
    );
};

describe('useUserPermissions', () => {
    it('checks single actions, action arrays, and missing resources', () => {
        render(<PermissionsHarness />);

        expect(screen.getByLabelText('tenant-read')).toHaveTextContent('true');
        expect(screen.getByLabelText('tenant-update')).toHaveTextContent('false');
        expect(screen.getByLabelText('any-tenant-action')).toHaveTextContent('true');
        expect(screen.getByLabelText('missing-resource')).toHaveTextContent('false');
        expect(screen.getByLabelText('permissions')).toHaveTextContent('"Tenant"');
    });
});
