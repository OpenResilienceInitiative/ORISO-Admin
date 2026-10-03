import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgencyList } from './index';
import styles from './styles.module.scss';

const mocks = vi.hoisted(() => ({
    agencies: [] as any[],
    navigate: vi.fn(),
    refetch: vi.fn(),
    // Query state overrides for the agencies list (default: loaded successfully).
    isLoading: false,
    isError: false,
    dpaGate: { dpaPublished: true, dpaSigned: true },
    // Token roles of the signed-in admin (default: a Träger admin).
    roles: ['tenant-admin'] as string[],
    // `GET /service/users/data` of the signed-in admin (only consulted for agency-scoped admins).
    userData: undefined as any,
    userDataLoading: false,
    userDataError: false,
}));

const translations: Record<string, string> = {
    agency: 'Agency',
    'agency.list.searchPlaceholder': 'Search by name or city',
    'agency.title.text': 'Agency list',
    'agency.title.text.self': 'Agency list',
    'agency.topics.collapse': 'Collapse topics',
    'agency.topics.expand': 'Expand topics',
    'agency.noTopics': 'No topics assigned',
    'agency.online.title': 'Availability',
    'agency.status.online': 'Online',
    'agency.status.offline': 'Offline',
    'agency.list.id': 'ID',
    'agency.list.createdDate': 'Created date',
    'agency.name': 'Name',
    'agency.description': 'Description',
    'agency.postcode': 'Postal code',
    'agency.city': 'City',
    tenantName: 'Tenant',
    'topics.title': 'Topics',
    status: 'Status',
    new: 'New',
    'tenants.list.empty': 'No data available',
    'message.error.default': 'Something went wrong. Please try again.',
};

const t = (key: string) => translations[key] || key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'en' } }),
}));

vi.mock('antd', () => ({
    Button: ({ children, className, disabled, onClick }: any) => (
        <button type="button" className={className} disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
    Grid: {
        useBreakpoint: () => ({ md: true }),
    },
    Tag: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('@ant-design/icons', () => ({
    DownOutlined: () => <span aria-hidden="true">down</span>,
    PlusOutlined: () => <span aria-hidden="true">plus</span>,
    UpOutlined: () => <span aria-hidden="true">up</span>,
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
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

vi.mock('../../../components/EditableTable/EditButtons', () => ({
    default: () => <div data-testid="edit-buttons" />,
}));

vi.mock('../../../components/EditableTable/StatusIcons', () => ({
    default: () => <div data-testid="status-icons" />,
}));

vi.mock('../../../resources/img/svg/table-actions/row_expand_200.svg', () => ({
    ReactComponent: ({ className }: { className?: string }) => (
        <svg className={className} data-testid="row-expand-200" />
    ),
}));

vi.mock('../../../resources/img/svg/table-actions/row_expand_400.svg', () => ({
    ReactComponent: ({ className }: { className?: string }) => (
        <svg className={className} data-testid="row-expand-400" />
    ),
}));

vi.mock('../../../resources/img/svg/table-actions/row_expand_filled.svg', () => ({
    ReactComponent: ({ className }: { className?: string }) => (
        <svg className={className} data-testid="row-expand-filled" />
    ),
}));

vi.mock('../../../components/GlobalSearch', () => ({
    GlobalSearchBar: ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="global-search">{children}</div>
    ),
}));

vi.mock('../../../components/ResizableTable', () => ({
    ResizeTable: ({ columns, dataSource, loading, locale }: any) => {
        const topicColumn = columns.find((column: any) => column.key === 'topics');
        const actionColumn = columns.find((column: any) => column.key === 'edit');

        return (
            <div>
                {loading && <div data-testid="table-loading" />}
                {!loading && dataSource.length === 0 && <div data-testid="table-empty">{locale?.emptyText}</div>}
                {dataSource.map((record: any) => (
                    <div key={record.id}>
                        <div data-testid={`topics-${record.id}`}>{topicColumn.render(record.topics, record)}</div>
                        <div data-testid={`actions-${record.id}`}>{actionColumn.render(undefined, record)}</div>
                    </div>
                ))}
            </div>
        );
    },
}));

vi.mock('../../../hooks/useAgencysData', () => ({
    useAgenciesData: () => ({
        data: mocks.isError ? undefined : { total: mocks.agencies.length, data: mocks.agencies },
        isLoading: mocks.isLoading,
        isError: mocks.isError,
        refetch: mocks.refetch,
    }),
}));

vi.mock('../../../hooks/useTenantsData', () => ({
    useTenantsData: () => ({ data: { data: [] } }),
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: () => true,
    }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        isSuperAdmin: false,
        isTenantScopedAdmin: mocks.roles.includes('tenant-admin'),
        tenantId: 84,
        hasRole: (role: string | string[]) =>
            (Array.isArray(role) ? role : [role]).some((candidate) => mocks.roles.includes(candidate)),
    }),
}));

vi.mock('../../../hooks/useUserData.hook', () => ({
    useUserData: () => ({
        data: mocks.userData,
        isLoading: mocks.userDataLoading,
        isError: mocks.userDataError,
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
    AgencyDeletionModal: () => <div data-testid="agency-deletion-modal" />,
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
        teamAgency: false,
        consultingType: '',
        status: 'ACTIVE',
        deleteDate: undefined,
        tenantId: 1,
        dataProtection: {
            dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE',
            agencyDataProtectionResponsibleContact: null,
            alternativeDataProtectionRepresentativeContact: null,
            dataProtectionOfficerContact: null,
        },
        agencyLogo: null,
        ...overrides,
    } as any);

describe('AgencyList topic rendering', () => {
    beforeEach(() => {
        mocks.agencies = [];
        mocks.isLoading = false;
        mocks.isError = false;
        mocks.navigate.mockReset();
        mocks.refetch.mockReset();
        mocks.dpaGate = { dpaPublished: true, dpaSigned: true };
        mocks.roles = ['tenant-admin'];
        mocks.userData = undefined;
        mocks.userDataLoading = false;
        mocks.userDataError = false;
    });

    it('renders a single topic without an expand button and without truncation styling', () => {
        const longTopicName =
            'A very long topic name that previously could be clipped with no way to reveal the full value';
        mocks.agencies = [buildAgency([{ id: 1, name: longTopicName }])];

        render(<AgencyList />);

        expect(screen.queryByRole('button', { name: 'Expand topics' })).not.toBeInTheDocument();
        expect(screen.getByText(longTopicName)).toHaveClass(styles.topicChipSingle);
    });

    it('renders an expand button when an agency has multiple topics', () => {
        mocks.agencies = [
            buildAgency([
                { id: 1, name: 'Topic A' },
                { id: 2, name: 'Topic B' },
            ]),
        ];

        render(<AgencyList />);

        expect(screen.getByRole('button', { name: 'Expand topics' })).toBeInTheDocument();
        expect(screen.getByText('Topic A')).not.toHaveClass(styles.topicChipSingle);
    });

    it('expands long multi-topic chips when the expand button is clicked', () => {
        const longTopicName = 'A very long topic name that should become fully readable after expanding the topic list';
        mocks.agencies = [
            buildAgency([
                { id: 1, name: longTopicName },
                { id: 2, name: 'Topic B' },
            ]),
        ];

        render(<AgencyList />);

        const expandButton = screen.getByRole('button', { name: 'Expand topics' });
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(expandButton);

        expect(screen.getByRole('button', { name: 'Collapse topics' })).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText(longTopicName)).toHaveClass(styles.topicChipExpanded);
        expect(screen.getByTestId('topics-agency-1').firstElementChild).toHaveClass(styles.topicsListExpanded);
    });

    it('shows the empty-state message when topics are enabled but none are assigned', () => {
        mocks.agencies = [buildAgency([])];

        render(<AgencyList />);

        expect(screen.getByText('No topics assigned')).toBeInTheDocument();
    });

    // #240: a failed agencies load must degrade to an error message, never hang
    // on the spinner. The query uses retry:false and fetchData's 30s timeout, so
    // isLoading resolves to false and isError drives a visible message.
    it('shows an error message and stops loading when the agencies query fails', () => {
        mocks.isError = true;
        mocks.isLoading = false;

        render(<AgencyList />);

        expect(screen.queryByTestId('table-loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('table-empty')).toHaveTextContent('Something went wrong. Please try again.');
    });

    it('shows the neutral empty text (not the error) when the load succeeds with no agencies', () => {
        mocks.isError = false;
        mocks.agencies = [];

        render(<AgencyList />);

        expect(screen.getByTestId('table-empty')).toHaveTextContent('No data available');
    });

    // The toolbar is desktop-only now — on a phone its search and create action
    // move into the bottom navigation — and the setup stub answers every media
    // query with `matches: false`, i.e. mobile.
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
        mocks.agencies = [buildAgency([{ id: 1, name: 'Topic A' }])];
        mocks.isLoading = false;
        mocks.isError = false;
        mocks.navigate.mockReset();
        mocks.refetch.mockReset();
        mocks.dpaGate = { dpaPublished: true, dpaSigned: true };
        mocks.roles = ['restricted-agency-admin', 'user-admin'];
        mocks.userData = undefined;
        mocks.userDataLoading = false;
        mocks.userDataError = false;
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
            buildAgency([{ id: 1, name: 'Topic A' }], { id: 42 }),
            buildAgency([{ id: 1, name: 'Topic A' }], { id: 43 }),
        ];

        render(<AgencyList />);

        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
        expect(screen.getByTestId('actions-42')).toBeInTheDocument();
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
    });

    it('ignores the consultant assignment, which names a centre the admin does not administer', () => {
        // The regression: /service/users/data listed one CONSULTANT agency while the admin
        // administers two others, and the landing forwarded into that consultant agency (#917).
        mocks.userData = { agencies: [{ id: 24, name: 'Centre they only counsel in' }] };
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
