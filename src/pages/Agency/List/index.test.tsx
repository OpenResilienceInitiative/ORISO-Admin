import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgencyList } from './index';
import styles from './styles.module.scss';

const mocks = vi.hoisted(() => ({
    agencies: [] as any[],
    navigate: vi.fn(),
    refetch: vi.fn(),
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
};

const t = (key: string) => translations[key] || key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'en' } }),
}));

vi.mock('antd', () => ({
    Button: ({ children, className, onClick }: any) => (
        <button type="button" className={className} onClick={onClick}>
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

vi.mock('../../../components/SearchInput/SearchInput', () => ({
    default: () => <div data-testid="search-input" />,
}));

vi.mock('../../../components/ResizableTable', () => ({
    ResizeTable: ({ columns, dataSource }: any) => {
        const topicColumn = columns.find((column: any) => column.key === 'topics');
        const actionColumn = columns.find((column: any) => column.key === 'edit');

        return (
            <div>
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
        data: { total: mocks.agencies.length, data: mocks.agencies },
        isLoading: false,
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
    }),
}));

vi.mock('../../../context/FeatureContext', () => ({
    useFeatureContext: () => ({
        isEnabled: () => true,
    }),
}));

vi.mock('./AgencyDeletionModal', () => ({
    AgencyDeletionModal: () => <div data-testid="agency-deletion-modal" />,
}));

const buildAgency = (topics: Array<{ id: number | null; name: string }>) =>
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
    } as any);

describe('AgencyList topic rendering', () => {
    beforeEach(() => {
        mocks.agencies = [];
        mocks.navigate.mockReset();
        mocks.refetch.mockReset();
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
});
