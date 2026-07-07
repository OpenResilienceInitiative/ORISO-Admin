import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgencyPageEdit } from './index';

// Render AgencyPageEdit inside a QueryClientProvider so child components that use
// react-query (e.g. RegistrationSettings → useConsultantsOrAdminsData) don't throw
// "No QueryClient set". Retries are off so a missing queryFn never hangs the test.
const renderWithClient = (ui: React.ReactElement<any>) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    navigate: vi.fn(),
    searchTenantData: vi.fn(),
    useTenantTopics: vi.fn(() => ({ data: [], isLoading: false })),
}));

const translations: Record<string, string> = {
    'agency.edit.general.headline': 'Zur Übersicht',
    'agency.edit.settings.general.title': 'Allgemeine Informationen',
    'agency.edit.general.general_information': 'Allgemeine Informationen',
    'agency.edit.general.general_information.name': 'Name',
    'agency.edit.general.general_information.description': 'Beschreibung',
    'agency.edit.general.address.postcode': 'PLZ',
    'agency.edit.general.address.city': 'Stadt',
    'agency.edit.settings.title': 'Einstellungen zum Beratungsangebot',
    'agency.edit.general.more_settings.tenant.title': 'Trägerzuordnung',
    'agency.form.registrationSettings.title': 'Sichtbarkeit in der Registrierung',
    'agency.form.registrationSettings.onlineWarning': 'Beratungsstelle sichtbar machen',
    'agency.form.registrationSettings.onlineDescription': 'Sichtbar stellen',
    'agency.form.registrationSettings.postCodeTitle': 'Für welches Gebiet ist die Beratungsstelle sichtbar?',
    'agency.form.registrationSettings.allPostCode': 'Für alle PLZ-Gebiete',
    'agency.form.registrationSettings.onlySelectedPostCodes': 'PLZ-Gebiete definieren',
    'agency.postcode.minimum': 'Die PLZ muss aus 5 Zahlen bestehen.',
    'btn.cancel': 'Abbrechen',
    'form.errors.required': 'Bitte füllen Sie das markierte Feld aus.',
    plsSelect: 'Bitte wählen',
    save: 'Speichern',
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
        useParams: () => ({ id: 'add' }),
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
    useAgencyData: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('../../../hooks/useAgencyPostCodesData', () => ({
    useAgencyPostCodesData: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/useAgencyUpdate', () => ({
    useAgencyUpdate: () => ({ mutate: mocks.mutate }),
}));

vi.mock('../../../hooks/useAgencyLegalDataMissing', () => ({
    useAgencyLegalDataMissing: () => false,
}));

vi.mock('../../../hooks/useAgencyHasConsultants', () => ({
    useAgencyHasConsultants: () => ({ data: false, isLoading: false }),
}));

vi.mock('../../../hooks/useTenantTopics', () => ({
    useTenantTopics: mocks.useTenantTopics,
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
    searchTenantData: mocks.searchTenantData,
}));

describe('AgencyPageEdit create flow', () => {
    beforeAll(() => {
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

    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.navigate.mockReset();
        mocks.searchTenantData.mockReset();
        mocks.searchTenantData.mockResolvedValue({
            data: [{ id: 7, name: 'Caritas Augsburg' }],
        });
    });

    it('renders the tenant assignment field for super-admin agency creation', async () => {
        renderWithClient(<AgencyPageEdit />);

        expect(await screen.findByText('Trägerzuordnung')).toBeInTheDocument();
        expect(mocks.searchTenantData).toHaveBeenCalledWith({ perPage: 1000 });
    });

    it('does not submit a new agency without a selected tenant', async () => {
        const user = userEvent.setup();
        renderWithClient(<AgencyPageEdit />);

        fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Neue Beratungsstelle' } });
        fireEvent.change(screen.getByPlaceholderText('PLZ'), { target: { value: '86161' } });
        fireEvent.change(screen.getByPlaceholderText('Stadt'), { target: { value: 'Augsburg' } });
        await user.click(screen.getByRole('button', { name: 'Speichern' }));

        await waitFor(() => {
            expect(screen.getByText('Bitte füllen Sie das markierte Feld aus.')).toBeInTheDocument();
        });
        expect(mocks.mutate).not.toHaveBeenCalled();
    });
});

describe('AgencyPageEdit — ADR-003 single-select topic picker', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.navigate.mockReset();
        mocks.searchTenantData.mockReset();
        mocks.searchTenantData.mockResolvedValue({ data: [{ id: 7, name: 'Caritas Augsburg' }] });
        mocks.useTenantTopics.mockReturnValue({
            data: [
                { id: 3, name: 'Schulden' },
                { id: 5, name: 'Sucht' },
            ],
            isLoading: false,
        });
    });

    afterEach(() => {
        mocks.useTenantTopics.mockReturnValue({ data: [], isLoading: false });
    });

    it('renders the topic picker as single-select (no isMulti), not the former multi-select', async () => {
        renderWithClient(<AgencyPageEdit />);

        // The picker only renders once topics have loaded, keyed by its label.
        const picker = (await screen.findByText('topics.title')).closest('.ant-form-item') as HTMLElement;
        const selectRoot = picker.querySelector('.ant-select');

        expect(selectRoot).not.toBeNull();
        expect(selectRoot).toHaveClass('ant-select-single');
        expect(selectRoot).not.toHaveClass('ant-select-multiple');
    });

    it('submits exactly one topic id, not an array, when one topic is chosen', async () => {
        const user = userEvent.setup();
        renderWithClient(<AgencyPageEdit />);

        const tenantPicker = (await screen.findByText('Trägerzuordnung')).closest('.ant-form-item') as HTMLElement;
        await user.click(tenantPicker.querySelector('.ant-select-selector') as HTMLElement);
        await user.click(await screen.findByTitle('Caritas Augsburg'));

        const picker = (await screen.findByText('topics.title')).closest('.ant-form-item') as HTMLElement;
        await user.click(picker.querySelector('.ant-select-selector') as HTMLElement);
        await user.click(await screen.findByTitle('Schulden'));

        fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Neue Beratungsstelle' } });
        fireEvent.change(screen.getByPlaceholderText('PLZ'), { target: { value: '86161' } });
        fireEvent.change(screen.getByPlaceholderText('Stadt'), { target: { value: 'Augsburg' } });

        await user.click(screen.getByRole('button', { name: 'Speichern' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
        const [submittedData] = mocks.mutate.mock.calls[0];
        // A pre-ADR-003 multi-select would submit an array that keeps growing/appending on
        // repeated edits; single-select must always submit exactly the one chosen id.
        expect(submittedData.topicIds).toEqual(['3']);
    });
});
