import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Form, notification } from 'antd';
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
    createConsultantProps: undefined as any,
    legalForm: {
        setFields: vi.fn(),
        scrollToField: vi.fn(),
    },
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
    CardEditable: function CardEditable({ children, initialValues }: { children: any; initialValues?: object }) {
        return (
            <Form initialValues={initialValues}>
                {typeof children === 'function'
                    ? children({ editing: true, form: undefined, startEditing: vi.fn() })
                    : children}
            </Form>
        );
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
    ResponsibleSettings: ({
        onSave,
    }: {
        onSave: (data: unknown, options: { onError: () => void; form: typeof mocks.legalForm }) => void;
    }) => (
        <button
            type="button"
            onClick={() =>
                onSave(
                    {
                        dataProtection: {
                            agencyDataProtectionResponsibleContact: {
                                nameAndLegalForm: 'E2E Responsible Operator gGmbH',
                            },
                        },
                    },
                    {
                        onError: vi.fn(),
                        form: mocks.legalForm,
                    },
                )
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
    CreateConsultantModal: (props: unknown) => {
        mocks.createConsultantProps = props;
        return <div data-testid="create-consultant-modal" />;
    },
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
        mocks.createConsultantProps = undefined;
        mocks.legalForm.setFields.mockReset();
        mocks.legalForm.scrollToField.mockReset();
    });

    it('renders the tenant assignment field for super-admin agency creation', async () => {
        const { container } = renderWithClient(<AgencyPageEdit />);

        // Required field: MuiSelectField mirrors MuiFormField's M3 label
        // convention (a visible " *" appended to the text) instead of antd's
        // CSS-only pseudo-asterisk. Assert the *accessible* label — MUI paints
        // the text twice (the <label>, plus the aria-hidden notched-outline
        // <legend>), so a plain text query matches both.
        expect(await screen.findByLabelText('Trägerzuordnung *')).toBeInTheDocument();
        // #620: create flow lays its three cards out in the responsive CardGrid —
        // cards share the row width and wrap/stack below the floor. The fixed-width
        // horizontal CardDeck must be gone from the create surface.
        expect(container.querySelector('[data-admin-card-grid]')).toBeInTheDocument();
        expect(container.querySelector('[data-admin-card-deck]')).not.toBeInTheDocument();
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

    it('requires saving a new agency before quick-creating its consultant', async () => {
        renderWithClient(<AgencyPageEdit />);

        await waitFor(() => expect(mocks.createConsultantProps).toBeDefined());
        expect(mocks.createConsultantProps).toMatchObject({
            disabled: true,
            disabledReasonKey: 'agency.form.registrationSettings.createConsultant.saveAgencyFirst',
        });
    });

    it('passes the persisted agency and its topic into consultant quick-create', async () => {
        mocks.routeId = '282';
        mocks.agencyData = {
            id: 282,
            name: 'E2E Agency',
            tenantId: 84,
            topics: [{ id: 7, name: 'Debt counselling' }],
        };

        renderWithClient(<AgencyPageEdit />);

        await waitFor(() =>
            expect(mocks.createConsultantProps).toMatchObject({
                agencyId: '282',
                topicIds: ['7'],
                disabled: false,
            }),
        );
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

    it('renders a structured service validation error on the responsible field and focuses it', async () => {
        mocks.routeId = '282';
        mocks.agencyData = {
            id: 282,
            name: 'E2E Agency',
            tenantId: 84,
            topics: [],
            dataProtection: {
                agencyDataProtectionResponsibleContact: {
                    nameAndLegalForm: 'E2E Responsible Operator gGmbH',
                },
            },
        };

        renderWithClient(<AgencyPageEdit section="legal" />);
        fireEvent.click(screen.getByRole('button', { name: 'Save responsible card' }));

        const mutationOptions = mocks.mutate.mock.calls[0][1];
        await mutationOptions.onError(
            new Response(
                JSON.stringify({
                    field: 'dataProtection',
                    reason: 'DATA_PROTECTION_RESPONSIBLE_IS_EMPTY',
                    message: 'A responsible contact is required.',
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            ),
        );

        const fieldName = ['dataProtection', 'agencyDataProtectionResponsibleContact', 'nameAndLegalForm'];
        expect(mocks.legalForm.setFields).toHaveBeenCalledWith([
            { name: fieldName, errors: ['agency.edit.settings.legal.validation.responsible_required'] },
        ]);
        expect(mocks.legalForm.scrollToField).toHaveBeenCalledWith(fieldName, { focus: true });
    });

    it('shows the generic error notification for an unsupported service validation reason', async () => {
        const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => undefined as never);
        mocks.routeId = '282';
        mocks.agencyData = { id: 282, name: 'E2E Agency', tenantId: 84, topics: [] };

        renderWithClient(<AgencyPageEdit section="legal" />);
        fireEvent.click(screen.getByRole('button', { name: 'Save responsible card' }));
        await mocks.mutate.mock.calls[0][1].onError(
            new Response(JSON.stringify({ field: 'dataProtection', reason: 'A_NEW_REASON' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        expect(notificationSpy).toHaveBeenCalledWith({ message: 'message.error.default', duration: 8 });
        notificationSpy.mockRestore();
    });
});
