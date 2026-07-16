import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantsList } from './index';

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    deleteTenant: vi.fn(),
    useTenantsData: vi.fn(),
    lastTableProps: undefined as any,
}));

const translations: Record<string, string> = {
    'tenants.list.empty': 'No tenants',
    'tenants.list.maxConsultants': 'Max. allowed consultants',
    'tenants.list.name': 'Name',
    'tenants.list.new': 'New',
    'tenants.list.subdomain': 'Subdomain',
    'tenants.list.tenantId': 'Tenant ID',
    'tenants.searchPlaceholder': 'Search by name or ID',
    'tenants.subTitle': 'Tenants',
    'tenants.title': 'Tenants',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => translations[key] || key,
    }),
}));

vi.mock('antd', () => ({
    Button: ({ children, className, icon, onClick }: any) => (
        <button type="button" className={className} onClick={onClick}>
            {icon}
            {children}
        </button>
    ),
    notification: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@ant-design/icons', () => ({
    PlusOutlined: () => <span aria-hidden="true">plus</span>,
}));

vi.mock('react-router-dom', () => ({
    Link: ({ children, className, target, to }: any) => (
        <a className={className} href={to} target={target}>
            {children}
        </a>
    ),
    useNavigate: () => mocks.navigate,
}));

vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.Title = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    return { Page };
});

vi.mock('../../../components/ResizableTable', () => ({
    ResizeTable: (props: any) => {
        mocks.lastTableProps = props;

        return (
            <div>
                <button
                    type="button"
                    onClick={() => props.onChange({ current: 1, pageSize: 10 }, {}, { field: 'id', order: 'ascend' })}
                >
                    sort tenant id
                </button>
            </div>
        );
    },
}));

vi.mock('../../../components/FloatingSearch', () => ({
    FloatingSearch: () => <div data-testid="search-input" />,
}));

vi.mock('../../../components/EditableTable/EditButtons', () => ({
    EditButtons: () => <div data-testid="edit-buttons" />,
}));

vi.mock('../../../components/Modal', () => ({
    Modal: () => <div data-testid="modal" />,
}));

vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: {
            mainTenantSubdomainForSingleDomainMultitenancy: '',
            multitenancyWithSingleDomainEnabled: true,
        },
    }),
}));

vi.mock('../../../hooks/useDeleteTenant', () => ({
    useDeleteTenant: () => ({ mutate: mocks.deleteTenant }),
}));

vi.mock('../../../hooks/useReleasesToggle.hook', () => ({
    useReleasesToggle: () => ({ isEnabled: () => true }),
}));

vi.mock('../../../hooks/useTenantsData', () => ({
    useTenantsData: (params: any) => mocks.useTenantsData(params),
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: () => true,
    }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        isSuperAdmin: true,
    }),
}));

describe('TenantsList', () => {
    beforeEach(() => {
        mocks.navigate.mockReset();
        mocks.deleteTenant.mockReset();
        mocks.useTenantsData.mockReset();
        mocks.lastTableProps = undefined;
        mocks.useTenantsData.mockReturnValue({ data: { total: 0, data: [] }, isLoading: false });
    });

    it('shows sortable tenant columns and forwards the selected sort to tenant search', async () => {
        render(<TenantsList />);

        const sortableColumns = mocks.lastTableProps.columns.filter((column: any) => column.sorter);

        expect(sortableColumns.map((column: any) => column.dataIndex)).toEqual(['name', 'id', 'beraterCount']);

        fireEvent.click(screen.getByRole('button', { name: 'sort tenant id' }));

        await waitFor(() =>
            expect(mocks.useTenantsData).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    dir: 'ASC',
                    sort: 'ID',
                }),
            ),
        );
    });
});
