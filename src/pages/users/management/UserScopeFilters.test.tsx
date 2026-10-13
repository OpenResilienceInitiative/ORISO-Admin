import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, renderHook, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    it('keeps search and actions available on a tab with no scope filters', async () => {
        const user = userEvent.setup();
        const onSearch = vi.fn();
        const onSearchChange = vi.fn();
        render(
            <UserScopeFilters
                sectionId={TypeOfUser.PlatformAdmins}
                filters={{}}
                onChange={vi.fn()}
                search={{ searchPlaceholder: 'Search accounts', onSearch, onSearchChange }}
                actions={<button type="button">New account</button>}
            />,
        );
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'New account' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        const input = screen.getByRole('textbox', { name: 'Search accounts' });
        await user.type(input, 'Alex{Enter}');
        expect(onSearch).toHaveBeenLastCalledWith('Alex');
        expect(onSearchChange).toHaveBeenLastCalledWith('Alex');
        await user.click(screen.getByRole('button', { name: 'Suche einklappen' }));
        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        expect(screen.getByRole('textbox', { name: 'Search accounts' })).toHaveValue('Alex');
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
        await user.click(screen.getByRole('combobox', { name: 'Träger' }));
        await user.clear(screen.getByRole('combobox', { name: 'Träger' }));
        await user.click(await screen.findByRole('option', { name: 'Diakonie Berlin' }));
        expect(onChange).toHaveBeenLastCalledWith({ tenantId: '7', agencyIds: [] });
        expect(screen.queryByRole('region', { name: /Gefiltert auf Beratungsstelle/ })).not.toBeInTheDocument();
        // One centre is deliberately not selectable without an active selection.
        expect(screen.getByRole('combobox', { name: 'Beratungsstelle' })).toBeDisabled();
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
