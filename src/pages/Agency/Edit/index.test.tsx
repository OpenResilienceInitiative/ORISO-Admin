import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgencyPageEdit } from './index';
import agencyStyles from './styles.module.scss';

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
    userRoles: {
        hasRole: () => true,
        isSuperAdmin: true,
        isTechnicalAccount: false,
        isTenantScopedAdmin: false,
        roles: [],
        tenantId: 0,
    },
    dpaGate: { dpaPublished: true, dpaSigned: true },
    routeId: 'add',
    agencyData: undefined as any,
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
    'agency.dpaGate.title': 'AVV-Unterschrift erforderlich',
    'agency.dpaGate.description': 'Unterschreiben Sie zuerst den AVV.',
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
        useParams: () => ({ id: mocks.routeId }),
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
    useAgencyData: () => ({ data: mocks.agencyData, isLoading: false }),
}));

vi.mock('./components/ResponsibleSettings', () => ({
    ResponsibleSettings: ({ onSave }: { onSave: (data: unknown) => void }) => (
        <button
            type="button"
            onClick={() =>
                onSave({
                    dataProtection: {
                        agencyDataProtectionResponsibleContact: { nameAndLegalForm: 'E2E Responsible Operator gGmbH' },
                    },
                })
            }
        >
            Save responsible card
        </button>
    ),
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
    useTenantTopics: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../hooks/useConsultantsOrAdminsData', () => ({
    useConsultantsOrAdminsData: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => mocks.userRoles,
}));

vi.mock('../../../hooks/useDpaGate.hook', () => ({
    useDpaGate: () => ({ data: mocks.dpaGate, isLoading: false, isError: false }),
}));

vi.mock('../../../api/tenant/searchTenantData', () => ({
    searchTenantData: mocks.searchTenantData,
}));

vi.mock('../../../components/CreateConsultantModal', () => ({
    CreateConsultantModal: () => <div data-testid="create-consultant-modal" />,
}));

beforeAll(() => {
    // The create flow now lays its cards out with CardDeck, whose mount effect
    // calls deck.scrollTo — not implemented in jsdom. Stub it (as the CardDeck
    // component's own test does) so the effect doesn't throw.
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

vi.mock('../../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: () => ({ tenantId: 0 }),
}));

describe('AgencyPageEdit create flow', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.navigate.mockReset();
        mocks.searchTenantData.mockReset();
        mocks.searchTenantData.mockResolvedValue({
            data: [{ id: 7, name: 'Caritas Augsburg' }],
        });
        mocks.userRoles = {
            hasRole: () => true,
            isSuperAdmin: true,
            isTechnicalAccount: false,
            isTenantScopedAdmin: false,
            roles: [],
            tenantId: 0,
        };
        mocks.dpaGate = { dpaPublished: true, dpaSigned: true };
        mocks.routeId = 'add';
        mocks.agencyData = undefined;
    });

    it('renders the tenant assignment field for super-admin agency creation', async () => {
        const { container } = renderWithClient(<AgencyPageEdit />);

        // Required field: SelectFormField now mirrors FormInputField's M3 label
        // convention (a visible " *" appended to the text) instead of antd's
        // CSS-only pseudo-asterisk.
        expect(await screen.findByText('Trägerzuordnung *')).toBeInTheDocument();
        expect(container.querySelector('[data-admin-card-deck]')).toHaveClass(agencyStyles.createCardDeck);
        expect(container.querySelectorAll('[data-admin-card-deck-item]')).toHaveLength(3);
        expect(mocks.searchTenantData).toHaveBeenCalledWith({ perPage: 1000 });
    });

    it('does not submit a new agency without a selected tenant', async () => {
        renderWithClient(<AgencyPageEdit />);

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neue Beratungsstelle' } });
        fireEvent.change(screen.getByLabelText('PLZ'), { target: { value: '86161' } });
        fireEvent.change(screen.getByLabelText('Stadt'), { target: { value: 'Augsburg' } });
        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

        // Generous timeout: the error surfaces via antd async validation plus a
        // notification render; the 1s findBy default is too tight on loaded CI
        // runners (observed flake in run 29576826138).
        expect(
            await screen.findByText('Bitte füllen Sie das markierte Feld aus.', undefined, { timeout: 5000 }),
        ).toBeInTheDocument();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('blocks the direct add route for a tenant admin whose DPA is unsigned', () => {
        mocks.userRoles = {
            hasRole: () => true,
            isSuperAdmin: false,
            isTechnicalAccount: false,
            isTenantScopedAdmin: true,
            roles: [],
            tenantId: 84,
        };
        mocks.dpaGate = { dpaPublished: true, dpaSigned: false };

        renderWithClient(<AgencyPageEdit />);

        expect(screen.getByText('AVV-Unterschrift erforderlich')).toBeInTheDocument();
        expect(screen.queryByLabelText('Name *')).not.toBeInTheDocument();
    });

    it('submits a legal card as a narrow patch so later saves cannot wipe sibling legal data', () => {
        mocks.routeId = '282';
        mocks.agencyData = {
            id: 282,
            name: 'E2E Agency',
            tenantId: 84,
            topics: [],
            dataProtection: {
                agencyDataProtectionResponsibleContact: null,
                dataProtectionOfficerContact: null,
            },
            content: { impressum: { en: '<p>existing</p>' } },
        };

        renderWithClient(<AgencyPageEdit section="legal" />);
        fireEvent.click(screen.getByRole('button', { name: 'Save responsible card' }));

        expect(mocks.mutate).toHaveBeenCalledWith(
            {
                dataProtection: {
                    agencyDataProtectionResponsibleContact: {
                        nameAndLegalForm: 'E2E Responsible Operator gGmbH',
                    },
                },
            },
            expect.any(Object),
        );
    });
});
