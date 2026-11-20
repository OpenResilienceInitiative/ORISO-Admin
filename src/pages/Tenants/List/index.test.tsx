import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TenantsList } from './index';

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    // `?q=` of the page address: the admin search (⌘K) opens the list narrowed this way.
    query: '',
    setSearchParams: vi.fn(),
    deleteTenant: vi.fn(),
    deleteOptions: undefined as { onSuccess?: () => void; onError?: () => void } | undefined,
    useTenantsData: vi.fn(),
    settings: {
        mainTenantSubdomainForSingleDomainMultitenancy: '',
        multitenancyWithSingleDomainEnabled: true,
    } as Record<string, unknown>,
    can: (() => true) as (action: string, resource: string) => boolean,
}));

// The subdomain switch is read through this mock, so each test states the mode it covers instead of
// depending on the value shipped in src/config/subdomainFeature.ts.
const subdomainFeature = vi.hoisted(() => ({ finished: false }));
vi.mock('../../../config/subdomainFeature', () => ({
    get SUBDOMAINS_TECHNICALLY_FINISHED() {
        return subdomainFeature.finished;
    },
}));

const translations: Record<string, string> = {
    'tenants.list.empty': 'No tenants',
    'tenants.list.maxConsultants': 'Max. allowed consultants',
    'tenants.list.name': 'Name',
    'tenants.list.new': 'New',
    'tenants.list.subdomain': 'Subdomain',
    'tenants.list.tenantId': 'Tenant ID',
    'tenants.list.tenantIdShort': 'ID',
    'tenants.list.adminEmails': 'Admin e-mail',
    'tenants.list.created': 'Created',
    'tenants.list.noAdmins': 'No admin',
    'tenants.list.details.show': 'Show details of {{name}}',
    'tenants.list.details.hide': 'Hide details of {{name}}',
    'tenants.list.deleteMessage.success': 'Tenant deleted.',
    'tenants.list.deleteMessage.error.title': 'Tenant could not be deleted.',
    'tenants.searchPlaceholder': 'Search by name or ID',
    'tenants.subTitle': 'Tenants',
    'tenants.title': 'Tenants',
    'userTable.card.edit': 'Edit {{name}}',
    'userTable.card.delete': 'Delete {{name}}',
    'userTable.rowMenu.label': 'More actions for {{name}}',
};

const t = (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
    const values = (typeof fallback === 'object' ? fallback : options) as Record<string, unknown> | undefined;
    const text = translations[key] ?? (typeof fallback === 'string' ? fallback : key);
    return text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values?.[name] ?? ''));
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'en' } }),
}));

vi.mock('react-router-dom', () => ({
    Link: ({ children, className, target, to }: any) => (
        <a className={className} href={to} target={target}>
            {children}
        </a>
    ),
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [new URLSearchParams(mocks.query ? { q: mocks.query } : {}), mocks.setSearchParams],
}));

vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.Title = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    return { Page };
});

vi.mock('../../../components/Modal', () => ({
    Modal: ({ onConfirm, titleKeyOptions }: { onConfirm: () => void; titleKeyOptions: { name: string } }) => (
        <div role="dialog" aria-label={`Delete ${titleKeyOptions.name}?`}>
            <button type="button" onClick={onConfirm}>
                Confirm delete
            </button>
        </div>
    ),
}));

vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: mocks.settings }),
}));

vi.mock('../../../hooks/useDeleteTenant', () => ({
    useDeleteTenant: (options: typeof mocks.deleteOptions) => {
        mocks.deleteOptions = options;
        return { mutate: mocks.deleteTenant };
    },
}));

vi.mock('../../../hooks/useReleasesToggle.hook', () => ({
    useReleasesToggle: () => ({ isEnabled: () => true }),
}));

vi.mock('../../../hooks/useTenantsData', () => ({
    useTenantsData: (params: any) => mocks.useTenantsData(params),
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: (action: string, resource: string) => mocks.can(action, resource) }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ isSuperAdmin: true }),
}));

const tenant = (overrides: Record<string, unknown> = {}) => ({
    id: 21,
    name: 'Caritas Nord',
    subdomain: 'nord',
    licensing: { allowedNumberOfUsers: 40 },
    adminEmails: ['admin@nord.example', 'second@nord.example', 'third@nord.example'],
    createDate: '2025-03-12T09:00:00Z',
    updateDate: '2026-10-29T09:00:00Z',
    ...overrides,
});

const withTenants = (rows: unknown[]) =>
    mocks.useTenantsData.mockReturnValue({ data: { total: rows.length, data: rows }, isLoading: false });

const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
};

// The toolbar is desktop-only — on a phone search and create move into the bottom navigation —
// and the setup stub answers every media query with `matches: false`, i.e. mobile.
const withDesktopLayout = () => {
    const stub = window.matchMedia as unknown as ReturnType<typeof vi.fn>;
    stub.mockImplementation((query: string) => ({
        matches: query.includes('min-width: 768px'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
};

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('TenantsList in the accounts-table design (#1184)', () => {
    beforeEach(() => {
        mocks.query = '';
        mocks.setSearchParams.mockReset();
        mocks.navigate.mockReset();
        mocks.deleteTenant.mockReset();
        mocks.useTenantsData.mockReset();
        mocks.settings = {
            mainTenantSubdomainForSingleDomainMultitenancy: '',
            multitenancyWithSingleDomainEnabled: true,
        };
        mocks.can = () => true;
        subdomainFeature.finished = false;
        withTenants([]);
        setWidth(1440);
    });

    afterEach(() => setWidth(1024));

    it('shows the first admin e-mail, how many more there are and both dates', () => {
        withTenants([tenant()]);

        render(<TenantsList />);

        const row = rowOf('Caritas Nord');
        expect(within(row).getByText('21')).toBeInTheDocument();
        expect(within(row).getByText('admin@nord.example')).toBeInTheDocument();
        expect(within(row).getByText('+2')).toBeInTheDocument();
        expect(within(row).getByText('12/03/2025')).toBeInTheDocument();
    });

    it('says when a Träger has no admin yet', () => {
        withTenants([tenant({ adminEmails: [] })]);

        render(<TenantsList />);

        expect(within(rowOf('Caritas Nord')).getByText('No admin')).toBeInTheDocument();
    });

    it('lists every admin in the expanded row', () => {
        withTenants([tenant()]);

        render(<TenantsList />);

        fireEvent.click(screen.getByRole('button', { name: 'Show details of Caritas Nord' }));

        expect(screen.getByRole('link', { name: 'third@nord.example' })).toHaveAttribute(
            'href',
            'mailto:third@nord.example',
        );
    });

    it('has no search field of its own and narrows the list by ?q= from the admin search', () => {
        withTenants([tenant()]);
        mocks.query = 'nord';

        render(<TenantsList />);

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(mocks.useTenantsData).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'nord', page: 1 }));
        expect(screen.getByTestId('list-search-bar')).toHaveTextContent('„nord“');
        fireEvent.click(within(screen.getByTestId('list-search-bar')).getByRole('button'));
        expect(mocks.setSearchParams).toHaveBeenCalled();
    });

    // Found in review (PR #1530): the page went back to 1 in an effect, so a new ?q= first asked for the old
    // page with the new search (usually empty: a flash of "no results").
    it('asks for page 1 of a new search at once, never for the old page', () => {
        mocks.useTenantsData.mockReturnValue({ data: { total: 30, data: [tenant()] }, isLoading: false });
        const { rerender } = render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Nächste Seite' }));
        expect(mocks.useTenantsData).toHaveBeenLastCalledWith(expect.objectContaining({ search: '', page: 2 }));

        mocks.query = 'nord';
        rerender(<TenantsList />);

        const pagesOfNewSearch = mocks.useTenantsData.mock.calls
            .map(([params]) => params)
            .filter((params) => params.search === 'nord')
            .map((params) => params.page);
        expect(pagesOfNewSearch.length).toBeGreaterThan(0);
        expect(pagesOfNewSearch.every((page) => page === 1)).toBe(true);

        // Paging on within the new search still works.
        fireEvent.click(screen.getByRole('button', { name: 'Nächste Seite' }));
        expect(mocks.useTenantsData).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'nord', page: 2 }));
    });

    it('shows sortable tenant columns and forwards the selected sort to tenant search', async () => {
        withTenants([tenant()]);

        render(<TenantsList />);

        fireEvent.click(screen.getByRole('button', { name: /^ID/ }));
        await waitFor(() =>
            expect(mocks.useTenantsData).toHaveBeenLastCalledWith(
                expect.objectContaining({ dir: 'ASC', sort: 'ID', page: 1 }),
            ),
        );

        // Subdomain, maximum of counsellors and the dates are no columns of the wide row.
        expect(screen.queryByRole('columnheader', { name: /^Max. allowed consultants/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /^Subdomain/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Created/ })).not.toBeInTheDocument();
    });

    it('keeps the subdomain out of the details (not technically finished), also with own domains', () => {
        withTenants([tenant()]);
        const { unmount } = render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Show details of Caritas Nord' }));
        expect(screen.getByText('Max. allowed consultants')).toBeInTheDocument();
        expect(screen.getByText('40')).toBeInTheDocument();
        expect(screen.queryByText('Subdomain')).not.toBeInTheDocument();
        unmount();

        mocks.settings = {
            mainTenantSubdomainForSingleDomainMultitenancy: '',
            multitenancyWithSingleDomainEnabled: false,
        };
        render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Show details of Caritas Nord' }));
        expect(screen.queryByText('Subdomain')).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /^Subdomain/ })).not.toBeInTheDocument();
    });

    it('shows the subdomain in the details only when Träger have their own domain, once subdomains are finished', () => {
        subdomainFeature.finished = true;
        withTenants([tenant()]);
        const { unmount } = render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Show details of Caritas Nord' }));
        expect(screen.queryByText('Subdomain')).not.toBeInTheDocument();
        unmount();

        mocks.settings = {
            mainTenantSubdomainForSingleDomainMultitenancy: '',
            multitenancyWithSingleDomainEnabled: false,
        };
        render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Show details of Caritas Nord' }));
        expect(screen.getByText('Subdomain')).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /^Subdomain/ })).not.toBeInTheDocument();
    });

    it('opens a Träger for editing', () => {
        withTenants([tenant()]);

        render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Edit Caritas Nord' }));

        expect(mocks.navigate).toHaveBeenCalledWith('/admin/tenants/21');
    });

    it('asks before deleting and reports the result above the list', () => {
        withTenants([tenant()]);

        render(<TenantsList />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete Caritas Nord' }));
        fireEvent.click(
            within(screen.getByRole('dialog', { name: 'Delete Caritas Nord?' })).getByText('Confirm delete'),
        );

        expect(mocks.deleteTenant).toHaveBeenCalledWith(21);
        act(() => mocks.deleteOptions?.onError?.());
        expect(screen.getByRole('alert')).toHaveTextContent('Tenant could not be deleted.');
    });

    it('keeps the main Träger of a single-domain installation from being deleted', () => {
        mocks.settings = {
            mainTenantSubdomainForSingleDomainMultitenancy: 'nord',
            multitenancyWithSingleDomainEnabled: true,
        };
        withTenants([tenant()]);

        render(<TenantsList />);

        expect(screen.getByRole('button', { name: 'Delete Caritas Nord' })).toBeDisabled();
    });

    it('leaves out actions the admin may not use', () => {
        withDesktopLayout();
        mocks.can = () => false;
        withTenants([tenant()]);

        render(<TenantsList />);

        expect(screen.queryByRole('button', { name: 'Edit Caritas Nord' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete Caritas Nord' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
    });

    it('starts the first Träger as the main Träger', () => {
        withDesktopLayout();
        render(<TenantsList />);

        fireEvent.click(screen.getByRole('button', { name: 'New' }));

        expect(mocks.navigate).toHaveBeenCalledWith('/admin/tenants/add/general?main=true');
    });

    it('says that the first page is loading on a phone instead of showing an empty area', () => {
        setWidth(390);
        mocks.useTenantsData.mockReturnValue({ data: undefined, isLoading: true });

        render(<TenantsList />);

        expect(screen.getByRole('status')).toHaveTextContent('loading');
    });

    it('marks the server default order (name A–Z) and reverses it on the first click', async () => {
        withTenants([tenant()]);

        render(<TenantsList />);

        expect(screen.getByRole('columnheader', { name: /^Name/ })).toHaveAttribute('aria-sort', 'ascending');
        fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
        await waitFor(() =>
            expect(mocks.useTenantsData).toHaveBeenLastCalledWith(
                expect.objectContaining({ sort: 'NAME', dir: 'DESC' }),
            ),
        );
    });

    it('shows one card per Träger on a phone', () => {
        setWidth(390);
        withTenants([tenant(), tenant({ id: 22, name: 'Caritas Süd' })]);

        render(<TenantsList />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Caritas Süd' })).toBeInTheDocument();
    });

    it('shows the empty text when there are no Träger', () => {
        render(<TenantsList />);

        expect(screen.getByText('No tenants')).toBeInTheDocument();
    });
});
