import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TenantAdminEditOrAdd } from './index';

// #902: a Träger-Admin (tenant-scoped tenant admin) regains create/update/delete on
// TenantAdminUser. These tests pin the two UI halves of that fix in this page:
//  - add mode must default AND lock the tenant to the caller's own tenant (the
//    "+ Neu" navigation passes no ?tenantId=, and a crafted query param must not
//    repoint the locked field),
//  - the Edit action must follow the update permission instead of rendering
//    unconditionally, and the shared /platform-admins/ route variant stays
//    super-admin-only.

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    can: vi.fn(),
    useUserRoles: vi.fn(),
    useTenantsData: vi.fn(),
    useTenantData: vi.fn(),
    useTenantUserAdminData: vi.fn(),
    mutate: vi.fn(),
    location: { pathname: '/admin/users/tenant-admins/add', search: '' },
    params: { id: 'add' } as { id: string },
}));

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'de' } }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        useParams: () => mocks.params,
        useLocation: () => mocks.location,
    };
});

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: mocks.can }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: mocks.useUserRoles,
}));

vi.mock('../../../hooks/useTenantsData', () => ({
    useTenantsData: mocks.useTenantsData,
}));

vi.mock('../../../hooks/useTenantData.hook', () => ({
    useTenantData: mocks.useTenantData,
}));

vi.mock('../../../hooks/useTenantUserAdminData', () => ({
    useTenantUserAdminData: mocks.useTenantUserAdminData,
}));

vi.mock('../../../hooks/useAddOrUpdateTenantAdmin.hook', () => ({
    useAddOrUpdateTenantAdmin: () => ({ mutate: mocks.mutate }),
}));

vi.mock('../../../components/GrantConsultantIdentityModal', () => ({
    GrantConsultantIdentityModal: () => null,
}));

vi.mock('../../../utils/canGrantConsultantIdentity', () => ({
    canGrantConsultantIdentity: () => false,
}));

vi.mock('../../../components/Page', () => {
    const Page = ({ children, isLoading }: { children: React.ReactNode; isLoading?: boolean }) => (
        <div data-testid="page">{isLoading ? 'loading' : children}</div>
    );
    Page.BackWithActions = function PageBackWithActions({
        children,
        title,
    }: {
        children: React.ReactNode;
        title?: React.ReactNode;
    }) {
        return (
            <div>
                <h1>{title}</h1>
                {children}
            </div>
        );
    };
    return { Page };
});

vi.mock('../../../components/Card', () => ({
    Card: function Card({ children, titleKey }: { children: React.ReactNode; titleKey: string }) {
        return (
            <section>
                <h2>{titleKey}</h2>
                {children}
            </section>
        );
    },
}));

vi.mock('../../../components/mui/MuiFormField', () => ({
    MuiFormField: ({ name }: { name: string }) => <div data-testid={`field-${name}`} />,
    MuiPasswordFormField: ({ name }: { name: string }) => <div data-testid={`field-${name}`} />,
}));

// The probe stands in for the tenant Autocomplete: antd's Form.Item injects the form
// value, so assertions can read the effective tenantId default, the explicit disabled
// prop, and which option labels the page offered.
vi.mock('../../../components/mui/MuiSelectField', async () => {
    const { Form } = await import('antd');
    const ReactModule = await import('react');

    const ValueProbe = ({
        value,
        disabled,
        optionLabels,
    }: {
        value?: unknown;
        disabled?: boolean;
        optionLabels: string;
    }) => (
        <output
            aria-label="tenant-select"
            data-value={value == null ? '' : String(value)}
            data-disabled={String(Boolean(disabled))}
            data-option-labels={optionLabels}
        />
    );

    const MuiSelectField = ({
        name,
        disabled,
        children,
    }: {
        name: string;
        disabled?: boolean;
        children?: React.ReactNode;
    }) => {
        const optionLabels = ReactModule.Children.toArray(children)
            .map((child) => (ReactModule.isValidElement(child) ? String((child.props as any).label ?? '') : ''))
            .filter(Boolean)
            .join('|');

        return (
            <Form.Item name={name}>
                <ValueProbe disabled={disabled} optionLabels={optionLabels} />
            </Form.Item>
        );
    };
    MuiSelectField.Option = () => null;

    return { MuiSelectField };
});

const renderPage = () => render(<TenantAdminEditOrAdd />);

const grantAllPermissions = () => mocks.can.mockReturnValue(true);
const denyUpdatePermission = () =>
    mocks.can.mockImplementation(
        (action: PermissionAction, resource: Resource) =>
            !(action === PermissionAction.Update && resource === Resource.TenantAdminUser),
    );

const asTenantScopedAdmin = () =>
    mocks.useUserRoles.mockReturnValue({ isSuperAdmin: false, isTenantScopedAdmin: true, tenantId: 2 });
const asSuperAdmin = () =>
    mocks.useUserRoles.mockReturnValue({ isSuperAdmin: true, isTenantScopedAdmin: false, tenantId: 0 });

describe('TenantAdminEditOrAdd (#902)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.location = { pathname: '/admin/users/tenant-admins/add', search: '' };
        mocks.params = { id: 'add' };
        mocks.useTenantData.mockReturnValue({ data: { id: 2, name: 'Tenant Zwei' } });
        mocks.useTenantsData.mockReturnValue({
            data: {
                data: [
                    { id: 2, name: 'Tenant Zwei' },
                    { id: 7, name: 'Tenant Sieben' },
                ],
            },
            isLoading: false,
        });
        mocks.useTenantUserAdminData.mockReturnValue({ data: undefined, isLoading: false });
    });

    describe('add mode as a tenant-scoped admin', () => {
        beforeEach(() => {
            grantAllPermissions();
            asTenantScopedAdmin();
        });

        it('defaults the tenant to the caller own tenant and locks the field', () => {
            renderPage();

            const select = screen.getByLabelText('tenant-select');
            expect(select).toHaveAttribute('data-value', '2');
            expect(select).toHaveAttribute('data-disabled', 'true');
        });

        it('offers the own tenant as the visible option', () => {
            renderPage();

            expect(screen.getByLabelText('tenant-select')).toHaveAttribute('data-option-labels', 'Tenant Zwei');
        });

        it('does not query the all-tenants search', () => {
            renderPage();

            expect(mocks.useTenantsData).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
        });

        it('ignores a crafted ?tenantId= query param and stays on the own tenant', () => {
            mocks.location = { pathname: '/admin/users/tenant-admins/add', search: '?tenantId=7' };

            renderPage();

            expect(screen.getByLabelText('tenant-select')).toHaveAttribute('data-value', '2');
        });
    });

    describe('add mode as a super admin', () => {
        beforeEach(() => {
            grantAllPermissions();
            asSuperAdmin();
        });

        it('keeps the tenant select unlocked with the full tenant list', () => {
            renderPage();

            const select = screen.getByLabelText('tenant-select');
            expect(select).toHaveAttribute('data-disabled', 'false');
            expect(select).toHaveAttribute('data-option-labels', 'Tenant Zwei|Tenant Sieben');
        });

        it('still honors a ?tenantId= preselection', () => {
            mocks.location = { pathname: '/admin/users/tenant-admins/add', search: '?tenantId=7' };

            renderPage();

            expect(screen.getByLabelText('tenant-select')).toHaveAttribute('data-value', '7');
        });
    });

    describe('edit mode', () => {
        beforeEach(() => {
            mocks.params = { id: '42' };
            mocks.location = { pathname: '/admin/users/tenant-admins/42', search: '' };
            mocks.useTenantUserAdminData.mockReturnValue({
                data: { firstname: 'Anna', lastname: 'Muster', tenantId: '2' },
                isLoading: false,
            });
        });

        it('shows the Edit action for a tenant admin with the update permission', () => {
            grantAllPermissions();
            asTenantScopedAdmin();

            renderPage();

            expect(screen.getByRole('button', { name: 'edit' })).toBeInTheDocument();
        });

        it('hides the Edit action without the update permission', () => {
            denyUpdatePermission();
            asTenantScopedAdmin();

            renderPage();

            expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        });

        it('hides the Edit action on the platform-admins route for a non-super tenant admin', () => {
            grantAllPermissions();
            asTenantScopedAdmin();
            mocks.location = { pathname: '/admin/users/platform-admins/42', search: '' };

            renderPage();

            expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
        });

        it('keeps the Edit action on the platform-admins route for a super admin', () => {
            grantAllPermissions();
            asSuperAdmin();
            mocks.location = { pathname: '/admin/users/platform-admins/42', search: '' };

            renderPage();

            expect(screen.getByRole('button', { name: 'edit' })).toBeInTheDocument();
        });
    });
});
