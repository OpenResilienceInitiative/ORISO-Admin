import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AgencyList } from './index';

const mocks = vi.hoisted(() => ({
    agencies: [] as any[],
    // Optional server pages by page number, with their total, for the phone "load more" flow.
    agencyPages: undefined as Record<number, any[]> | undefined,
    agencyTotal: undefined as number | undefined,
    navigate: vi.fn(),
    refetch: vi.fn(),
    // Arguments of the latest agencies query (sort, page, search).
    lastQuery: undefined as any,
    // Query state overrides for the agencies list (default: loaded successfully).
    isLoading: false,
    isError: false,
    dpaGate: { dpaPublished: true, dpaSigned: true },
    // Token roles of the signed-in admin (default: a Träger admin).
    roles: ['tenant-admin'] as string[],
    isSuperAdmin: false,
    can: (() => true) as (action: string, resource: string) => boolean,
}));

const translations: Record<string, string> = {
    agency: 'Agency',
    'agency.list.searchPlaceholder': 'Search by name or city',
    'agency.noTopics': 'No topics assigned',
    'agency.status.online': 'Visible',
    'agency.status.offline': 'Hidden',
    'agency.teamAgency': 'Team centre',
    'agency.list.id': 'ID',
    'agency.list.address': 'Address',
    'agency.list.contact': 'Contact',
    'agency.list.details.show': 'Show details of {{name}}',
    'agency.list.details.hide': 'Hide details of {{name}}',
    'agency.name': 'Name',
    'userTable.card.edit': 'Edit {{name}}',
    'userTable.card.delete': 'Delete {{name}}',
    'userTable.rowMenu.label': 'More actions for {{name}}',
    'userTable.status.IN_DELETION': 'Being deleted',
    tenantName: 'Tenant',
    'topics.title': 'Topics',
    status: 'Status',
    new: 'New',
    'tenants.list.empty': 'No data available',
    'message.error.default': 'Something went wrong. Please try again.',
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
    useNavigate: () => mocks.navigate,
    Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
        <div data-testid="navigate" data-to={to} data-replace={String(Boolean(replace))} />
    ),
}));

vi.mock('use-debounce', () => ({
    useDebouncedCallback: (fn: (...args: any[]) => void) => fn,
}));

vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.Title = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    return { Page };
});

vi.mock('../../../components/GlobalSearch', () => ({
    GlobalSearchBar: ({ children, onSearch }: { children?: React.ReactNode; onSearch?: (query: string) => void }) => (
        <div data-testid="global-search">
            <input
                aria-label="Search agencies"
                onKeyDown={(event) => {
                    if (event.key === 'Enter') onSearch?.(event.currentTarget.value);
                }}
            />
            {children}
        </div>
    ),
}));

vi.mock('../../../hooks/useAgencysData', () => ({
    useAgenciesData: (query: { search?: string; current?: number }) => {
        mocks.lastQuery = query;
        const { search } = query;
        const matching = search
            ? mocks.agencies.filter((agency) =>
                  `${agency.name} ${agency.city}`.toLowerCase().includes(search.toLowerCase()),
              )
            : mocks.agencies;
        const agencies = mocks.agencyPages ? mocks.agencyPages[query.current ?? 1] ?? [] : matching;
        return {
            data: mocks.isError ? undefined : { total: mocks.agencyTotal ?? agencies.length, data: agencies },
            isLoading: mocks.isLoading,
            isError: mocks.isError,
            refetch: mocks.refetch,
        };
    },
}));

vi.mock('../../../hooks/useTenantsData', () => ({
    useTenantsData: () => ({ data: { data: [{ id: 1, name: 'Caritas Nord' }] } }),
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: (action: string, resource: string) => mocks.can(action, resource) }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        isSuperAdmin: mocks.isSuperAdmin,
        isTenantScopedAdmin: mocks.roles.includes('tenant-admin'),
        tenantId: 84,
        hasRole: (role: string | string[]) =>
            (Array.isArray(role) ? role : [role]).some((candidate) => mocks.roles.includes(candidate)),
    }),
}));

vi.mock('../../../hooks/useDpaGate.hook', () => ({
    useDpaGate: () => ({ data: mocks.dpaGate, isLoading: false, isError: false }),
}));

vi.mock('../../../context/FeatureContext', () => ({
    useFeatureContext: () => ({
        isEnabled: () => true,
    }),
}));

vi.mock('./AgencyDeletionModal', () => ({
    AgencyDeletionModal: ({ agencyModel }: { agencyModel: { name: string } }) => (
        <div data-testid="agency-deletion-modal">{agencyModel.name}</div>
    ),
}));

const buildAgency = (topics: Array<{ id: number | null; name: string }>, overrides: Record<string, unknown> = {}) =>
    ({
        id: 'agency-1',
        name: 'Agency One',
        city: 'Berlin',
        counsellingRelations: [],
        topics,
        topicIds: [],
        description: 'Description',
        offline: false,
        online: true,
        postcode: '10115',
        street: 'Musterstraße',
        houseNumber: '12a',
        teamAgency: 'false',
        consultingType: '',
        status: 'CREATED',
        deleteDate: undefined,
        tenantId: 1,
        updateDate: '2026-10-30T10:00:00Z',
        agencyLogo: null,
        ...overrides,
    } as any);

// The layout follows the list width; jsdom has no ResizeObserver, so the window width decides.
const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
};

// The toolbar is desktop-only — on a phone its search and create action move into the bottom
// navigation — and the setup stub answers every media query with `matches: false`, i.e. mobile.
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

const resetMocks = () => {
    mocks.agencies = [];
    mocks.agencyPages = undefined;
    mocks.agencyTotal = undefined;
    mocks.isLoading = false;
    mocks.isError = false;
    mocks.lastQuery = undefined;
    mocks.navigate.mockReset();
    mocks.refetch.mockReset();
    mocks.dpaGate = { dpaPublished: true, dpaSigned: true };
    mocks.roles = ['tenant-admin'];
    mocks.isSuperAdmin = false;
    mocks.can = () => true;
    setWidth(1440);
};

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

afterEach(() => setWidth(1024));

describe('AgencyList in the accounts-table design (#1184)', () => {
    beforeEach(resetMocks);

    it('shows name, ID, street with house number over postcode and city, visibility and actions per row', () => {
        mocks.agencies = [buildAgency([{ id: 1, name: 'Topic A' }], { id: 42, name: 'Beratungsstelle Nord' })];

        render(<AgencyList />);

        const row = rowOf('Beratungsstelle Nord');
        expect(within(row).getByText('42')).toBeInTheDocument();
        expect(within(row).getByText('Musterstraße 12a')).toBeInTheDocument();
        expect(within(row).getByText('10115 Berlin')).toBeInTheDocument();
        expect(within(row).getByText('Visible')).toBeInTheDocument();
        expect(within(row).getByRole('button', { name: 'Edit Beratungsstelle Nord' })).toBeEnabled();
        expect(within(row).getByRole('button', { name: 'Delete Beratungsstelle Nord' })).toBeEnabled();
    });

    it('marks team centres and hidden centres', () => {
        mocks.agencies = [buildAgency([], { id: 7, name: 'Team Süd', teamAgency: 'true', offline: true })];

        render(<AgencyList />);

        const row = rowOf('Team Süd');
        expect(within(row).getByText('Team centre')).toBeInTheDocument();
        expect(within(row).getByText('Hidden')).toBeInTheDocument();
    });

    it('shows the first topic and how many more there are', () => {
        mocks.agencies = [
            buildAgency([
                { id: 1, name: 'Topic A' },
                { id: 2, name: 'Topic B' },
                { id: 3, name: 'Topic C' },
            ]),
        ];

        render(<AgencyList />);

        const row = rowOf('Agency One');
        expect(within(row).getByText('Topic A')).toBeInTheDocument();
        expect(within(row).getByText('+2')).toBeInTheDocument();
        expect(within(row).queryByText('Topic B')).not.toBeInTheDocument();
    });

    it('says so when topics are enabled but none are assigned', () => {
        mocks.agencies = [buildAgency([])];

        render(<AgencyList />);

        expect(screen.getByText('No topics assigned')).toBeInTheDocument();
    });

    it('opens contact and every topic in the expanded row', () => {
        mocks.agencies = [
            buildAgency(
                [
                    { id: 1, name: 'Topic A' },
                    { id: 2, name: 'Topic B' },
                ],
                { phone: '+49 30 1234', email: 'nord@example.org' },
            ),
        ];

        render(<AgencyList />);

        const toggle = screen.getByRole('button', { name: 'Show details of Agency One' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(toggle);

        expect(screen.getByRole('button', { name: 'Hide details of Agency One' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getByRole('link', { name: '+49 30 1234' })).toHaveAttribute('href', 'tel:+49 30 1234');
        expect(screen.getByRole('link', { name: 'nord@example.org' })).toHaveAttribute(
            'href',
            'mailto:nord@example.org',
        );
        expect(screen.getByText('Topic A, Topic B')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('keeps edit and delete off a centre that is being deleted', () => {
        mocks.agencies = [buildAgency([], { status: 'IN_DELETION' })];

        render(<AgencyList />);

        const row = rowOf('Agency One');
        expect(within(row).getByText('Being deleted')).toBeInTheDocument();
        expect(within(row).getByRole('button', { name: 'Edit Agency One' })).toBeDisabled();
        expect(within(row).getByRole('button', { name: 'Delete Agency One' })).toBeDisabled();
    });

    it('leaves out actions the admin may not use', () => {
        mocks.can = (action) => action === 'read';
        mocks.agencies = [buildAgency([])];

        render(<AgencyList />);

        expect(screen.queryByRole('button', { name: 'Edit Agency One' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete Agency One' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Show details of Agency One' })).toBeInTheDocument();
    });

    it('opens the centre for editing and asks before deleting it', () => {
        mocks.agencies = [buildAgency([], { id: 42 })];

        render(<AgencyList />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit Agency One' }));
        expect(mocks.navigate).toHaveBeenCalledWith('/admin/agency/42');

        fireEvent.click(screen.getByRole('button', { name: 'Delete Agency One' }));
        expect(screen.getByTestId('agency-deletion-modal')).toHaveTextContent('Agency One');
    });

    it('sorts on the server by the clicked column and returns to the first page', () => {
        mocks.agencies = [buildAgency([])];

        render(<AgencyList />);

        fireEvent.click(screen.getByRole('button', { name: /^ID/ }));
        expect(mocks.lastQuery).toMatchObject({ sortBy: 'ID', order: 'ASC', current: 1 });

        fireEvent.click(screen.getByRole('button', { name: /^ID/ }));
        expect(mocks.lastQuery).toMatchObject({ sortBy: 'ID', order: 'DESC' });

        fireEvent.click(screen.getByRole('button', { name: /^Address/ }));
        expect(mocks.lastQuery).toMatchObject({ sortBy: 'POST_CODE', order: 'ASC' });
    });

    it('shows the Träger only to the platform admin', () => {
        mocks.agencies = [buildAgency([], { tenantName: undefined })];

        const { unmount } = render(<AgencyList />);
        expect(screen.queryByRole('columnheader', { name: 'Tenant' })).not.toBeInTheDocument();
        unmount();

        mocks.isSuperAdmin = true;
        render(<AgencyList />);
        expect(screen.getByRole('columnheader', { name: 'Tenant' })).toBeInTheDocument();
        expect(within(rowOf('Agency One')).getByText('Caritas Nord')).toBeInTheDocument();
    });

    it('moves the actions into one menu in the tablet band', () => {
        setWidth(900);
        mocks.agencies = [buildAgency([], { id: 42 })];

        render(<AgencyList />);

        expect(screen.getByRole('button', { name: 'More actions for Agency One' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit Agency One' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: /^ID/ })).not.toBeInTheDocument();
        expect(screen.getByText('ID 42')).toBeInTheDocument();
    });

    it('says that the first page is loading on a phone instead of showing an empty area', () => {
        setWidth(390);
        mocks.isLoading = true;

        render(<AgencyList />);

        expect(screen.getByRole('status')).toHaveTextContent('loading');
    });

    it('marks the server default order (name A–Z) in the header and reverses it on the first click', () => {
        mocks.agencies = [buildAgency([])];

        render(<AgencyList />);

        expect(screen.getByRole('columnheader', { name: /^Name/ })).toHaveAttribute('aria-sort', 'ascending');
        fireEvent.click(screen.getByRole('button', { name: /^Name/ }));
        expect(mocks.lastQuery).toMatchObject({ sortBy: 'NAME', order: 'DESC' });
    });

    it('shows one card per centre on a phone', () => {
        setWidth(390);
        mocks.agencies = [
            buildAgency([], { id: 1, name: 'North centre' }),
            buildAgency([], { id: 2, name: 'South centre', offline: true }),
        ];

        render(<AgencyList />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        const south = screen.getByRole('article', { name: 'South centre' });
        expect(within(south).getByText('Hidden')).toBeInTheDocument();
        expect(within(south).getByRole('button', { name: 'Edit South centre' })).toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'North centre' })).toBeInTheDocument();
    });

    // CodeRabbit on #1285: the phone list appends the next page and never shows a centre twice when
    // the server order shifts between two page requests.
    it('appends the next page on a phone without showing a centre twice', () => {
        setWidth(390);
        mocks.agencyTotal = 4;
        mocks.agencyPages = {
            1: [buildAgency([], { id: 1, name: 'North centre' }), buildAgency([], { id: 2, name: 'South centre' })],
            2: [buildAgency([], { id: 2, name: 'South centre' }), buildAgency([], { id: 3, name: 'West centre' })],
        };

        const { rerender } = render(<AgencyList />);
        expect(screen.getAllByRole('article')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Weitere laden' }));
        expect(mocks.lastQuery).toMatchObject({ current: 2 });
        rerender(<AgencyList />);

        expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
            'North centre',
            'South centre',
            'West centre',
        ]);
    });

    // #240: a failed agencies load must degrade to an error message, never hang on the spinner.
    it('shows an error message and stops loading when the agencies query fails', () => {
        mocks.isError = true;

        render(<AgencyList />);

        expect(screen.queryByTestId('data-table-skeleton-row')).not.toBeInTheDocument();
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('shows the neutral empty text (not the error) when the load succeeds with no agencies', () => {
        render(<AgencyList />);

        expect(screen.getByText('No data available')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
    });

    it('disables agency creation until the tenant DPA is signed', () => {
        withDesktopLayout();
        mocks.dpaGate = { dpaPublished: true, dpaSigned: false };

        render(<AgencyList />);

        expect(screen.getByRole('button', { name: 'New' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'New' }));
        expect(mocks.navigate).not.toHaveBeenCalled();
    });
});

describe('AgencyList landing for a Beratungsstellen-Admin (ORISO-Admin#917)', () => {
    beforeEach(() => {
        resetMocks();
        mocks.agencies = [buildAgency([{ id: 1, name: 'Topic A' }])];
        mocks.roles = ['restricted-agency-admin', 'user-admin'];
    });

    it('forwards straight into the settings of the single administered agency', () => {
        mocks.agencies = [buildAgency([{ id: 1, name: 'Topic A' }], { id: 42, name: 'Beratungsstelle Nord' })];

        render(<AgencyList />);

        const navigate = screen.getByTestId('navigate');
        expect(navigate).toHaveAttribute('data-to', '/admin/agency/42');
        expect(navigate).toHaveAttribute('data-replace', 'true');
    });

    it('stays on the list when several agencies are administered', () => {
        mocks.agencies = [
            buildAgency([{ id: 1, name: 'Topic A' }], { id: 42, name: 'North centre' }),
            buildAgency([{ id: 1, name: 'Topic A' }], { id: 43, name: 'South centre' }),
        ];

        render(<AgencyList />);

        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
        expect(screen.getByText('North centre')).toBeInTheDocument();
    });

    it('renders nothing while the administered agencies are still loading, so the list does not flash', () => {
        mocks.isLoading = true;

        const { container } = render(<AgencyList />);

        expect(container).toBeEmptyDOMElement();
    });

    it('falls back to the list when the administered agencies cannot be loaded', () => {
        mocks.isError = true;

        render(<AgencyList />);

        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('keeps an active search on the list when two administered agencies narrow to one', () => {
        withDesktopLayout();
        mocks.agencies = [
            buildAgency([], { id: 42, name: 'North centre' }),
            buildAgency([], { id: 43, name: 'South centre' }),
        ];
        render(<AgencyList />);
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
        expect(screen.getByText('North centre')).toBeInTheDocument();
        expect(screen.getByText('South centre')).toBeInTheDocument();

        const search = screen.getByRole('textbox', { name: 'Search agencies' });
        fireEvent.change(search, { target: { value: 'North' } });
        fireEvent.keyDown(search, { key: 'Enter' });

        expect(screen.getByText('North centre')).toBeInTheDocument();
        expect(screen.queryByText('South centre')).not.toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('ignores the consultant assignment, which names a centre the admin does not administer', () => {
        // The regression: /service/users/data listed one CONSULTANT agency while the admin
        // administers two others, and the landing forwarded into that consultant agency (#917).
        mocks.agencies = [
            buildAgency([{ id: 1, name: 'Topic A' }], { id: 2 }),
            buildAgency([{ id: 1, name: 'Topic A' }], { id: 22 }),
        ];

        render(<AgencyList />);

        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('never forwards a Träger admin, whatever the assignment says', () => {
        mocks.roles = ['tenant-admin', 'restricted-agency-admin'];
        mocks.agencies = [buildAgency([{ id: 1, name: 'Topic A' }], { id: 42 })];

        render(<AgencyList />);

        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
});
