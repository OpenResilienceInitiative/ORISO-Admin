import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionAction } from '../../../enums/PermissionAction';
import { Resource } from '../../../enums/Resource';
import { TenantAdminEditOrAdd } from './index';

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    can: vi.fn(),
    useUserRoles: vi.fn(),
    useTenantsData: vi.fn(),
    useTenantData: vi.fn(),
    useTenantUserAdminData: vi.fn(),
    mutate: vi.fn(),
    useAddOrUpdateTenantAdmin: vi.fn(),
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
    useAddOrUpdateTenantAdmin: mocks.useAddOrUpdateTenantAdmin,
}));

vi.mock('../../ErrorPages/AccessDenied', () => ({
    AccessDenied: () => <div role="alert">access-denied</div>,
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

vi.mock('../../../components/mui/MuiFormField', async () => {
    const { Form } = await import('antd');
    const Field = ({ name }: { name: string }) => (
        <Form.Item name={name}>
            <input aria-label={name} />
        </Form.Item>
    );
    return { MuiFormField: Field, MuiPasswordFormField: Field };
});

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
        onChange,
    }: {
        value?: unknown;
        disabled?: boolean;
        optionLabels: string;
        onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    }) => (
        <input
            aria-label="tenant-select"
            value={value == null ? '' : String(value)}
            onChange={onChange}
            disabled={disabled}
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

describe('TenantAdminEditOrAdd', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useAddOrUpdateTenantAdmin.mockReturnValue({ mutate: mocks.mutate });
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

    describe('submission authorization', () => {
        beforeEach(() => {
            grantAllPermissions();
            asTenantScopedAdmin();
        });

        it('does not offer Save on a direct platform-admin add route', () => {
            mocks.location.pathname = '/admin/users/platform-admins/add';
            renderPage();
            expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
        });

        it('does not fetch or expose an edit record without Read permission', () => {
            mocks.params.id = '42';
            mocks.can.mockImplementation((action: PermissionAction) => action !== PermissionAction.Read);
            renderPage();
            expect(mocks.useTenantUserAdminData).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
            expect(mocks.useAddOrUpdateTenantAdmin).toHaveBeenCalledWith(expect.objectContaining({ id: '' }));
            expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
            expect(screen.queryByLabelText('firstname')).not.toBeInTheDocument();
        });

        it('does not offer Save without Create permission', () => {
            mocks.can.mockImplementation((action: PermissionAction) => action !== PermissionAction.Create);
            renderPage();
            expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
        });

        it('fails closed without a valid own tenant even with a crafted query', () => {
            mocks.useUserRoles.mockReturnValue({ isSuperAdmin: false, isTenantScopedAdmin: false, tenantId: null });
            mocks.location.search = '?tenantId=7';
            renderPage();
            expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
            expect(mocks.useTenantsData).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
        });

        it.each([
            { data: undefined, isLoading: true },
            { data: undefined, isError: true },
            { data: { id: 7, name: 'Other tenant' } },
        ])('does not offer Save until the own tenant is confirmed: %j', (result) => {
            mocks.useTenantData.mockReturnValue(result);
            renderPage();
            expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
        });

        it('renders access denied without a submit form on the platform-admin add route', () => {
            mocks.location.pathname = '/admin/users/platform-admins/add';
            const { container } = renderPage();
            expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
            expect(container.querySelector('form')).toBeNull();
            expect(mocks.mutate).not.toHaveBeenCalled();
        });

        it('submits the own tenant for an authorized create', async () => {
            renderPage();
            fireEvent.click(screen.getByRole('button', { name: 'save' }));
            await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: '2' })));
        });

        it('submits an authorized own-tenant update', async () => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({ data: { tenantId: '2' }, isLoading: false });
            renderPage();
            fireEvent.click(screen.getByRole('button', { name: 'edit' }));
            fireEvent.click(screen.getByRole('button', { name: 'save' }));
            await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: '2' })));
        });

        it('permits a super admin to create a platform admin', async () => {
            asSuperAdmin();
            mocks.location.pathname = '/admin/users/platform-admins/add';
            renderPage();
            fireEvent.click(screen.getByRole('button', { name: 'save' }));
            await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: '0' })));
        });

        it('rejects a crafted foreign tenant on create before calling the mutation', async () => {
            const { container } = renderPage();
            fireEvent.change(screen.getByLabelText('tenant-select'), { target: { value: '7' } });
            expect(screen.getByLabelText('tenant-select')).toHaveValue('7');
            await act(async () => {
                fireEvent.submit(container.querySelector('form')!);
            });
            expect(mocks.mutate).not.toHaveBeenCalled();
        });

        it('rejects a crafted foreign tenant on update before calling the mutation', async () => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({ data: { tenantId: '2' }, isLoading: false });
            const { container } = renderPage();
            fireEvent.click(screen.getByRole('button', { name: 'edit' }));
            fireEvent.change(screen.getByLabelText('tenant-select'), { target: { value: '7' } });
            expect(screen.getByLabelText('tenant-select')).toHaveValue('7');
            await act(async () => {
                fireEvent.submit(container.querySelector('form')!);
            });
            expect(mocks.mutate).not.toHaveBeenCalled();
        });

        it.each([false, true])(
            'never renders foreign cached record data, including during refetch: %s',
            (isLoading) => {
                mocks.params.id = '42';
                mocks.location.pathname = '/admin/users/tenant-admins/42';
                mocks.useTenantUserAdminData.mockReturnValue({
                    data: { tenantId: '7', firstname: 'Foreign', lastname: 'Private', email: 'foreign@example.test' },
                    isLoading,
                });
                renderPage();
                expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
                expect(screen.queryByText('Foreign Private')).not.toBeInTheDocument();
                expect(screen.queryByDisplayValue('foreign@example.test')).not.toBeInTheDocument();
                expect(screen.queryByLabelText('firstname')).not.toBeInTheDocument();
            },
        );

        it.each([
            { data: undefined, isLoading: false, isError: true },
            { data: undefined, isLoading: false },
        ])('does not render an edit form for an inaccessible record: %j', (result) => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue(result);
            renderPage();
            expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
            expect(screen.queryByLabelText('firstname')).not.toBeInTheDocument();
        });

        it('does not fetch or expose records on an unauthorized platform route', () => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/platform-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({
                data: { tenantId: '0', firstname: 'Platform' },
                isLoading: false,
            });
            renderPage();
            expect(mocks.useTenantUserAdminData).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
            expect(mocks.useAddOrUpdateTenantAdmin).toHaveBeenCalledWith(expect.objectContaining({ id: '' }));
            expect(screen.getByRole('alert')).toHaveTextContent('access-denied');
            expect(screen.queryByDisplayValue('Platform')).not.toBeInTheDocument();
        });

        it('denies editing a cached record belonging to another tenant', () => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({ data: { tenantId: '7' }, isLoading: false });
            renderPage();
            expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
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

    describe('navigation between cached records', () => {
        beforeEach(() => {
            grantAllPermissions();
            asTenantScopedAdmin();
        });

        it('starts read-only with the new record values when changing edit routes', () => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({
                data: { tenantId: '2', firstname: 'Anna', lastname: 'First', email: 'first@example.test' },
                isLoading: false,
            });
            const { rerender } = renderPage();
            fireEvent.click(screen.getByRole('button', { name: 'edit' }));
            fireEvent.change(screen.getByLabelText('firstname'), { target: { value: 'Unsaved' } });
            mocks.params.id = '43';
            mocks.location.pathname = '/admin/users/tenant-admins/43';
            mocks.useTenantUserAdminData.mockReturnValue({
                data: { tenantId: '2', firstname: 'Berta', lastname: 'Second', email: 'second@example.test' },
                isLoading: false,
            });
            rerender(<TenantAdminEditOrAdd />);
            expect(screen.getByRole('heading', { name: 'Berta Second' })).toBeInTheDocument();
            expect(screen.getByLabelText('firstname')).toHaveValue('Berta');
            expect(screen.getByLabelText('email')).toHaveValue('second@example.test');
            expect(screen.getByRole('button', { name: 'edit' })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
        });

        it('clears edit values and permits creating a new admin on the add route', () => {
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({
                data: { tenantId: '2', firstname: 'Anna', email: 'first@example.test' },
                isLoading: false,
            });
            const { rerender } = renderPage();
            mocks.params.id = 'add';
            mocks.location.pathname = '/admin/users/tenant-admins/add';
            mocks.useTenantUserAdminData.mockReturnValue({ data: undefined, isLoading: false });
            rerender(<TenantAdminEditOrAdd />);
            expect(screen.getByLabelText('firstname')).toHaveValue('');
            expect(screen.getByLabelText('email')).toHaveValue('');
            expect(screen.getByRole('button', { name: 'save' })).toBeInTheDocument();
            expect(screen.getByLabelText('tenant-select')).toHaveValue('2');
        });

        it('discards add draft values and opens a cached record read-only', () => {
            const { rerender } = renderPage();
            fireEvent.change(screen.getByLabelText('firstname'), { target: { value: 'Draft' } });
            mocks.params.id = '42';
            mocks.location.pathname = '/admin/users/tenant-admins/42';
            mocks.useTenantUserAdminData.mockReturnValue({
                data: { tenantId: '2', firstname: 'Anna', email: 'first@example.test' },
                isLoading: false,
            });
            rerender(<TenantAdminEditOrAdd />);
            expect(screen.getByLabelText('firstname')).toHaveValue('Anna');
            expect(screen.getByRole('button', { name: 'edit' })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
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
