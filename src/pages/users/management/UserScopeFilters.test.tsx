import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, renderHook, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { UserScopeFilters, useScopeFilterAvailability } from './UserScopeFilters';

import type { UserSearchFilters } from '../../../utils/userSearchFilters';

const role = vi.hoisted(() => ({ isSuperAdmin: false, isTenantScopedAdmin: false }));
const can = vi.hoisted(() => vi.fn(() => false));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => role }));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can }) }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('../../../hooks/useTenantsData', () => ({
    useTenantsData: () => ({
        data: {
            data: [
                { id: 3, name: 'Caritas Hamburg' },
                { id: 7, name: 'Diakonie Berlin' },
            ],
        },
    }),
}));
vi.mock('../../../hooks/useAgencysData', () => ({
    useAgenciesData: () => ({
        data: {
            data: [
                { id: 101, name: 'Nord', tenantId: 3 },
                { id: 102, name: 'Mitte', tenantId: 7 },
                { id: 103, name: 'Süd', tenantId: 3 },
            ],
        },
    }),
}));

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

describe('unified account toolbar', () => {
    it('has no search field of its own (the admin search, ⌘K, is the one place to type) and keeps actions', () => {
        render(
            <UserScopeFilters
                sectionId={TypeOfUser.PlatformAdmins}
                filters={{}}
                onChange={vi.fn()}
                actions={<button type="button">New account</button>}
            />,
        );
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Suche ausklappen' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'New account' })).toBeInTheDocument();
    });

    it('clears selected centres when switching Träger and offers only the new Träger centres', async () => {
        role.isSuperAdmin = true;
        can.mockReturnValue(true);
        const user = userEvent.setup();
        const onChange = vi.fn();
        const Toolbar = () => {
            const [filters, setFilters] = useState<UserSearchFilters>({ tenantId: '3', agencyIds: ['101'] });
            return (
                <UserScopeFilters
                    sectionId={TypeOfUser.Consultants}
                    filters={filters}
                    onChange={(next) => {
                        onChange(next);
                        setFilters(next);
                    }}
                />
            );
        };
        render(<Toolbar />);
        // Two filters are set, and the button says so; the pickers fold out behind it (Admin#1510).
        await user.click(screen.getByRole('button', { name: /^Filter/ }));
        await user.click(screen.getByRole('combobox', { name: 'Träger' }));
        await user.clear(screen.getByRole('combobox', { name: 'Träger' }));
        await user.click(await screen.findByRole('option', { name: 'Diakonie Berlin' }));
        expect(onChange).toHaveBeenLastCalledWith({ tenantId: '7', agencyIds: [] });
        expect(screen.queryByRole('region', { name: /Gefiltert auf Beratungsstelle/ })).not.toBeInTheDocument();
        // A choice of one is no choice: the centre picker is not offered for a Träger with one centre.
        expect(screen.queryByRole('combobox', { name: 'Beratungsstelle' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('combobox', { name: 'Träger' }));
        await user.clear(screen.getByRole('combobox', { name: 'Träger' }));
        await user.click(await screen.findByRole('option', { name: 'Caritas Hamburg' }));
        await user.click(screen.getByRole('combobox', { name: 'Beratungsstelle' }));
        const list = within(await screen.findByRole('listbox'));
        expect(list.getAllByRole('option')).toHaveLength(2);
        expect(list.getByRole('option', { name: 'Nord' })).toBeInTheDocument();
        expect(list.getByRole('option', { name: 'Süd' })).toBeInTheDocument();
        expect(list.queryByRole('option', { name: 'Mitte' })).not.toBeInTheDocument();
    });
});
