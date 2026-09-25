import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../../enums/UserRole';
import { useLegalTextReadOnlyReason } from './useLegalTextReadOnlyReason';

const h = vi.hoisted(() => ({
    settings: {} as Record<string, unknown>,
    roles: [] as string[],
}));

vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: h.settings }),
}));
vi.mock('../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ hasRole: (role: string) => h.roles.includes(role) }),
}));

const LOCKED = { multitenancyWithSingleDomainEnabled: true, legalContentChangesBySingleTenantAdminsAllowed: false };

describe('useLegalTextReadOnlyReason', () => {
    beforeEach(() => {
        h.settings = LOCKED;
        h.roles = [];
    });

    it.each([UserRole.AgencyAdmin, UserRole.SingleTenantAdmin])(
        'names the platform-wide lock for a %s it actually blocks',
        (role) => {
            h.roles = [role];

            const { result } = renderHook(() => useLegalTextReadOnlyReason());

            expect(result.current).toEqual({ key: 'tenants.legal.readOnly.lockedPlatformWide', platformLock: true });
        },
    );

    it('keeps the Träger wording when the lock is released', () => {
        h.settings = { ...LOCKED, legalContentChangesBySingleTenantAdminsAllowed: true };
        h.roles = [UserRole.AgencyAdmin];

        const { result } = renderHook(() => useLegalTextReadOnlyReason());

        expect(result.current).toEqual({ key: 'tenants.legal.readOnly.managedByTraeger', platformLock: false });
    });

    // A restricted agency admin may never change legal texts, lock or not: the lock is not the reason.
    it('keeps the Träger wording for a role the lock does not govern', () => {
        h.roles = [UserRole.RestrictedAgencyAdmin];

        const { result } = renderHook(() => useLegalTextReadOnlyReason());

        expect(result.current.platformLock).toBe(false);
    });

    it('has no lock without single-domain multitenancy', () => {
        h.settings = {
            multitenancyWithSingleDomainEnabled: false,
            legalContentChangesBySingleTenantAdminsAllowed: false,
        };
        h.roles = [UserRole.AgencyAdmin];

        const { result } = renderHook(() => useLegalTextReadOnlyReason());

        expect(result.current.platformLock).toBe(false);
    });
});
