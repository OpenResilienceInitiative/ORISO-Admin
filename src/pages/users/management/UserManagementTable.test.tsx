import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { UserScopeFiltersProps } from './UserScopeFilters';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { UserManagementTable } from './UserManagementTable';

const state = vi.hoisted(() => ({ section: 'tenant-admins', isSuperAdmin: false, canManage: true, navigate: vi.fn() }));
vi.mock('react-router-dom', async (original) => ({
    ...(await original<typeof import('react-router-dom')>()),
    useParams: () => ({ typeOfUsers: state.section }),
    useNavigate: () => state.navigate,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: state.isSuperAdmin, hasRole: () => true }),
}));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => state.canManage }) }));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 2, licensing: {} } }) }));
vi.mock('../../../hooks/useReleasesToggle.hook', () => ({ useReleasesToggle: () => ({ isEnabled: () => true }) }));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: true } }),
}));
vi.mock('../../../hooks/useConsultantsOrAdminsData', () => ({
    useConsultantsOrAdminsData: () => ({
        data: {
            data: [
                {
                    id: '7',
                    status: 'IN_DELETION',
                    firstname: 'Dana',
                    lastname: 'Deleting',
                    email: 'dana@example.test',
                    username: 'dana',
                    agencies: [],
                },
            ],
            total: 1,
        },
        refetch: vi.fn(),
    }),
}));
vi.mock('../../../hooks/useTenantsData', () => ({ useTenantsData: () => ({}) }));
vi.mock('../../../hooks/useTenantUserAdminsData', () => ({
    useTenantAdminsData: () => ({
        data: {
            data: [
                {
                    id: '42',
                    tenantId: 2,
                    firstName: 'Alex',
                    lastName: 'Tenant',
                    email: 'alex@example.test',
                    username: 'alex',
                    agencies: [],
                },
            ],
            total: 1,
        },
        refetch: vi.fn(),
    }),
}));
vi.mock('../../../hooks/usePlatformAdminsData', () => ({
    usePlatformAdminsData: () => ({
        data: {
            data: [
                {
                    id: '43',
                    tenantId: 0,
                    firstName: 'Pat',
                    lastName: 'Platform',
                    email: 'pat@example.test',
                    username: 'pat',
                    agencies: [],
                },
            ],
            total: 1,
        },
        refetch: vi.fn(),
    }),
}));
// Filters and saved sorts have separate regression suites; this suite exercises real row actions.
vi.mock('../../../hooks/useAdminListPreferences', () => ({
    useAdminListPreferences: () => ({ data: { sorts: {} }, isLoading: false }),
    useSaveAdminListSort: () => vi.fn(),
}));
vi.mock('./UserScopeFilters', () => ({
    UserScopeFilters: ({ actions, search }: UserScopeFiltersProps) => (
        <div role="group" aria-label="account toolbar">
            {search && <input aria-label={search.searchPlaceholder} />}
            {actions}
        </div>
    ),
    useScopeFilterAvailability: () => ({ tenant: false, agency: false, canListAgencies: false }),
}));
vi.mock('../../../hooks/useDeleteTenant', () => ({ useDeleteTenant: () => ({ mutate: vi.fn() }) }));
vi.mock('../../../components/GlobalSearch', () => ({
    GlobalSearchBar: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('../../../components/Page/PageMobileActions', () => ({
    PageMobileActions: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('../List/components/DeleteUser', () => ({ DeleteUserModal: () => null }));
vi.mock('../List/components/DeleteTenantAdmin', () => ({
    DeleteTenantAdminModal: () => <div>delete-confirmation</div>,
}));
describe('UserManagementTable section authorization', () => {
    beforeEach(() => {
        state.section = TypeOfUser.TenantAdmins;
        state.isSuperAdmin = false;
        state.canManage = true;
        state.navigate.mockClear();
    });
    const show = () =>
        render(
            <MemoryRouter>
                <UserManagementTable />
            </MemoryRouter>,
        );

    it('hides create and actual row mutation buttons on platform admins for scoped admins', () => {
        state.section = TypeOfUser.PlatformAdmins;
        show();
        expect(screen.queryByRole('button', { name: /new$/ })).not.toBeInTheDocument();
        const table = within(screen.getByRole('table'));
        expect(table.queryByRole('button', { name: 'userTable.card.edit', exact: true })).toBeNull();
        expect(table.queryByRole('button', { name: 'userTable.card.delete', exact: true })).toBeNull();
    });

    it('keeps create, edit and delete wired for scoped admins on tenant admins', () => {
        show();
        fireEvent.click(screen.getByRole('button', { name: /new$/ }));
        expect(state.navigate).toHaveBeenLastCalledWith(expect.stringContaining('/add'));
        const row = within(screen.getByRole('table'));
        fireEvent.click(row.getByRole('button', { name: 'userTable.card.edit', exact: true }));
        expect(state.navigate).toHaveBeenLastCalledWith(expect.stringContaining('/42'));
        fireEvent.click(row.getByRole('button', { name: 'userTable.card.delete', exact: true }));
        expect(screen.getByText('delete-confirmation')).toBeInTheDocument();
    });

    it('renders search and permitted actions together exactly once', () => {
        show();
        const toolbar = within(screen.getByRole('group', { name: 'account toolbar' }));
        expect(toolbar.getByRole('textbox')).toBeInTheDocument();
        expect(toolbar.getByRole('button', { name: /new$/ })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /new$/ })).toHaveLength(1);
    });

    it('labels invitations as navigation and points to the invitations section', () => {
        state.isSuperAdmin = true;
        show();
        const link = screen.getByRole('link', { name: 'userTable.goToInvitations' });
        expect(link).toHaveAttribute('href', '/admin/links');
        expect(within(screen.getByRole('group', { name: 'account toolbar' })).getByRole('link')).toBe(link);
    });

    it('preserves platform-admin actions for super admins', () => {
        state.section = TypeOfUser.PlatformAdmins;
        state.isSuperAdmin = true;
        show();
        expect(screen.getByRole('button', { name: /new$/ })).toBeInTheDocument();
        const row = within(screen.getByRole('table'));
        expect(row.getByRole('button', { name: 'userTable.card.edit', exact: true })).toBeInTheDocument();
        expect(row.getByRole('button', { name: 'userTable.card.delete', exact: true })).toBeInTheDocument();
    });

    describe('ending a running deletion', () => {
        const cancelAction = () => screen.queryAllByRole('button', { name: 'deletionWindow.cancel.action' });
        const pauseAction = () => screen.queryAllByRole('button', { name: 'deletionWindow.pause.action' });

        it('offers cancel and pause for a consultant in deletion', () => {
            state.section = TypeOfUser.Consultants;
            show();
            expect(cancelAction()).toHaveLength(1);
            expect(pauseAction()).toHaveLength(1);
        });

        it('offers nothing outside the consultants section', () => {
            state.section = TypeOfUser.AgencyAdmins;
            show();
            expect(cancelAction()).toHaveLength(0);
            expect(pauseAction()).toHaveLength(0);
        });

        it('offers nothing when the management permission is denied', () => {
            state.section = TypeOfUser.Consultants;
            state.canManage = false;
            show();
            expect(cancelAction()).toHaveLength(0);
            expect(pauseAction()).toHaveLength(0);
        });
    });
});
