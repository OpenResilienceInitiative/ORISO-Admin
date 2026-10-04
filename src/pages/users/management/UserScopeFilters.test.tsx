import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { useScopeFilterAvailability } from './UserScopeFilters';

const role = vi.hoisted(() => ({ isSuperAdmin: false, isTenantScopedAdmin: false }));
const can = vi.hoisted(() => vi.fn(() => false));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => role }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can }) }));

beforeEach(() => {
    role.isSuperAdmin = false;
    role.isTenantScopedAdmin = false;
    can.mockReset().mockReturnValue(false);
});

describe('user-list centre filter access', () => {
    it('lets a Träger admin list their own centres without agency management permissions', () => {
        role.isTenantScopedAdmin = true;
        const { result } = renderHook(() => useScopeFilterAvailability(TypeOfUser.AgencyAdmins));
        expect(result.current.canListAgencies).toBe(true);
        expect(result.current.tenant).toBe(false);
    });

    it('keeps centre options unavailable to callers without a centre-listing role', () => {
        const { result } = renderHook(() => useScopeFilterAvailability(TypeOfUser.Consultants));
        expect(result.current.canListAgencies).toBe(false);
    });

    it('keeps centre options available to agency admins', () => {
        can.mockReturnValue(true);
        const { result } = renderHook(() => useScopeFilterAvailability(TypeOfUser.Consultants));
        expect(result.current.canListAgencies).toBe(true);
    });

    it('does not fetch centres on a tab whose rows do not belong to centres', () => {
        role.isTenantScopedAdmin = true;
        can.mockReturnValue(true);
        const { result } = renderHook(() => useScopeFilterAvailability(TypeOfUser.TenantAdmins));
        expect(result.current.canListAgencies).toBe(false);
    });
});
