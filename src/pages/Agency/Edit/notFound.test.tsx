import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgencyPageEdit } from './index';
import { AgencyAccessError } from '../../../api/agency/getAgencyById';

// Verifies the fix for: calling /admin/agency/:id for an agency that is 404 (does not
// exist) or 403 (exists but the current user can't see it) must never render the edit
// form with empty/stale fields — it must render a safe, identical not-found/access-denied
// state with a "Back to overview" action instead. Normal loads keep rendering the form.
const renderWithClient = (ui: React.ReactElement<any>) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    useAgencyData: vi.fn(),
    useParamsId: 'agency-42',
}));

const translations: Record<string, string> = {
    'agency.edit.general.headline': 'Zur Übersicht',
    'agency.edit.settings.general.title': 'Allgemeine Informationen',
    'agency.edit.general.general_information': 'Allgemeine Informationen',
    'agency.edit.general.general_information.name': 'Name',
    'agency.edit.notFound.title': 'Nicht verfügbar',
    'agency.edit.notFound.description':
        'Diese Beratungsstelle konnte nicht gefunden werden oder Sie haben keinen Zugriff darauf.',
    'agency.edit.notFound.backToOverview': 'Zur Übersicht',
    edit: 'Bearbeiten',
};

const t = (key: string) => translations[key] || key;

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t], { t, i18n: { language: 'de' } }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        useParams: () => ({ id: mocks.useParamsId }),
    };
});

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
                <h2>{t(titleKey)}</h2>
                {children}
            </section>
        );
    },
}));

vi.mock('../../../components/CardEditable', () => ({
    CardEditable: function CardEditable({ children }: { children: React.ReactNode }) {
        return <div>{children}</div>;
    },
}));

vi.mock('../../../components/Tenants/AppSettings/PermissionsSettings', () => ({
    PermissionsSettings: () => <div />,
}));

vi.mock('../../../components/Tenants/LegalSettings/components/DataProcessingAgreementContainer', () => ({
    DataProcessingAgreementContainer: () => <div />,
}));

vi.mock('../../../context/FeatureContext', () => ({
    useFeatureContext: () => ({ isEnabled: () => false }),
}));

vi.mock('../../../hooks/useReleasesToggle.hook', () => ({
    useReleasesToggle: () => ({ isEnabled: () => false }),
}));

vi.mock('../../../hooks/useAgencyData', () => ({
    useAgencyData: (...args: unknown[]) => mocks.useAgencyData(...args),
}));

vi.mock('../../../hooks/useAgencyPostCodesData', () => ({
    useAgencyPostCodesData: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/useAgencyUpdate', () => ({
    useAgencyUpdate: () => ({ mutate: vi.fn() }),
}));

vi.mock('../../../hooks/useAgencyLegalDataMissing', () => ({
    useAgencyLegalDataMissing: () => false,
}));

vi.mock('../../../hooks/useAgencyHasConsultants', () => ({
    useAgencyHasConsultants: () => ({ data: false, isLoading: false }),
}));

vi.mock('../../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/useConsultantsOrAdminsData', () => ({
    useConsultantsOrAdminsData: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: () => true,
        isSuperAdmin: true,
        isTechnicalAccount: false,
        isTenantScopedAdmin: false,
        roles: [],
        tenantId: 0,
    }),
}));

vi.mock('../../../api/tenant/searchTenantData', () => ({
    searchTenantData: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../../components/CreateConsultantModal', () => ({
    CreateConsultantModal: () => <div data-testid="create-consultant-modal" />,
}));

vi.mock('../../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: () => ({ tenantId: 0 }),
}));

beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        configurable: true,
        value: vi.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            addEventListener: vi.fn(),
            addListener: vi.fn(),
            dispatchEvent: vi.fn(),
            matches: false,
            media: query,
            onchange: null,
            removeEventListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    });
});

describe('AgencyPageEdit — inaccessible agency (404/403)', () => {
    beforeEach(() => {
        mocks.navigate.mockReset();
        mocks.useAgencyData.mockReset();
        mocks.useParamsId = 'agency-42';
    });

    it('renders the edit form for a normal, accessible agency', async () => {
        mocks.useAgencyData.mockReturnValue({
            data: { id: 'agency-42', name: 'Caritas Augsburg' },
            isLoading: false,
            error: undefined,
        });

        renderWithClient(<AgencyPageEdit />);

        expect(await screen.findByText('Caritas Augsburg')).toBeInTheDocument();
        expect(screen.queryByText('Nicht verfügbar')).not.toBeInTheDocument();
    });

    it('does not render the edit form and shows the not-found state for a 404 (non-existent agency)', async () => {
        mocks.useAgencyData.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new AgencyAccessError(),
        });

        renderWithClient(<AgencyPageEdit />);

        expect(await screen.findByText('Nicht verfügbar')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Diese Beratungsstelle konnte nicht gefunden werden oder Sie haben keinen Zugriff darauf.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zur Übersicht' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
        expect(screen.queryByText('Bearbeiten')).not.toBeInTheDocument();
    });

    it('does not render the edit form and shows the same not-found state for a 403 (inaccessible agency)', async () => {
        mocks.useAgencyData.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new AgencyAccessError(),
        });

        renderWithClient(<AgencyPageEdit />);

        expect(await screen.findByText('Nicht verfügbar')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Diese Beratungsstelle konnte nicht gefunden werden oder Sie haben keinen Zugriff darauf.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Zur Übersicht' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
    });

    it('navigates back to the agency overview when "Back to overview" is clicked', async () => {
        mocks.useAgencyData.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new AgencyAccessError(),
        });

        const { default: userEvent } = await import('@testing-library/user-event');
        renderWithClient(<AgencyPageEdit />);

        await userEvent.click(await screen.findByRole('button', { name: 'Zur Übersicht' }));

        expect(mocks.navigate).toHaveBeenCalledWith('/admin/agency');
    });

    it('does not show stale data from a previously loaded agency after navigating to an inaccessible one', async () => {
        mocks.useAgencyData.mockReturnValue({
            data: { id: 'agency-1', name: 'Alte Beratungsstelle' },
            isLoading: false,
            error: undefined,
        });
        const { rerender } = renderWithClient(<AgencyPageEdit />);
        expect(await screen.findByText('Alte Beratungsstelle')).toBeInTheDocument();

        // Simulate the route change to a different, inaccessible agency id: react-query
        // keys on [AGENCY, id], so a genuinely new id starts a fresh (loading -> error)
        // query rather than keeping the previous agency's data around.
        mocks.useParamsId = 'agency-99';
        mocks.useAgencyData.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new AgencyAccessError(),
        });

        rerender(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <AgencyPageEdit />
            </QueryClientProvider>,
        );

        expect(await screen.findByText('Nicht verfügbar')).toBeInTheDocument();
        expect(screen.queryByText('Alte Beratungsstelle')).not.toBeInTheDocument();
    });
});
