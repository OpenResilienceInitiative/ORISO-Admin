import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Form, notification } from 'antd';
import { AgencyPageEdit } from './index';

// Render AgencyPageEdit inside a QueryClientProvider so child components that use
// react-query (e.g. RegistrationSettings → useConsultantsOrAdminsData) don't throw
// "No QueryClient set". Retries are off so a missing queryFn never hangs the test.
const renderWithClient = (ui: React.ReactElement<any>) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(ui, {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
};

// Every test here mounts the whole agency edit page and drives it through real antd
// interactions. The heaviest take ~16s of CPU on an idle machine, which leaves no room
// under the project's 30s budget once CI runs files in parallel: the same test measures
// 16.2s on dev, and a run whose wall time is half its cumulative test time doubles that.
vi.setConfig({ testTimeout: 60_000 });

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    statusHttp: vi.fn(),
    statusOwnActive: null as boolean | null,
    mutateAsync: vi.fn(),
    isAgencySaving: false,
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
    tenantTopicsLoading: false,
    tenantTopicsError: false,
    tenantTopics: [] as Array<{ id: number; name: string; status: string }>,
    consultants: [] as Array<{ id: number; firstname: string; lastname: string; email: string }>,
    hasConsultants: false,
    consultantSearchFilters: [] as Array<unknown>,
    consultantSearchCalls: [] as Array<{ filters?: unknown; enabled?: boolean; rethrowOnFailure?: boolean }>,
    consultantSearchFailed: false,
    // Per Träger (the `tenantId` filter of the request): its search has not answered yet or failed.
    consultantSearchByTenant: {} as Record<string, 'pending' | 'failed'>,
    consultantSearchRefetch: vi.fn(),
    // Mounted copies of the mocked search hook, so a test can make a retry re-render them.
    consultantSearchListeners: new Set<() => void>(),
    authTenantId: 0,
    cardSaveOnError: vi.fn(),
    legalForm: {
        setFields: vi.fn(),
        scrollToField: vi.fn(),
    },
    agencyLegalProps: undefined as any,
}));

beforeEach(() => {
    mocks.consultantSearchFilters = [];
    mocks.consultantSearchCalls = [];
    mocks.consultantSearchFailed = false;
    mocks.consultantSearchByTenant = {};
    mocks.consultantSearchRefetch.mockReset();
    mocks.authTenantId = 0;
});

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
    'agency.edit.form.validationFailed':
        'Die Beratungsstelle wurde nicht gespeichert. Bitte füllen Sie die markierten Pflichtfelder aus:',
    'agency.form.registrationSettings.title': 'Sichtbarkeit in der Registrierung',
    'agency.form.registrationSettings.onlineWarning': 'Beratungsstelle sichtbar machen',
    'agency.form.registrationSettings.onlineDescription': 'Sichtbar stellen',
    'agency.form.registrationSettings.consultants.label': 'Berater:innen hinzufügen',
    'agency.form.registrationSettings.consultants.selectTenantFirst':
        'Wählen Sie zuerst die Trägerzuordnung, dann können Sie Berater:innen dieses Trägers zuweisen.',
    'agency.form.registrationSettings.consultants.loadError': 'Die Berater:innen konnten nicht geladen werden.',
    'agency.form.registrationSettings.consultants.retry': 'Erneut laden',
    'agency.form.registrationSettings.consultants.noneInTenant':
        'In diesem Träger gibt es keine weiteren Berater:innen zur Auswahl.',
    'agency.form.registrationSettings.onlineNeedsConsultant':
        'Wählen Sie mindestens eine:n Berater:in aus, bevor Sie die Beratungsstelle in der Registrierung sichtbar machen.',
    'agency.form.registrationSettings.noTopicConfirm.title': 'Kein Thema ausgewählt',
    'agency.form.registrationSettings.noTopicConfirm.text':
        'Sie haben kein Thema ausgewählt. Möchten Sie die Beratung trotzdem aktivieren?',
    'agency.form.registrationSettings.noTopicConfirm.cancel': 'Abbrechen',
    'agency.form.registrationSettings.noTopicConfirm.confirm': 'Trotzdem aktivieren',
    'topics.title': 'Themen',
    'agency.edit.settings.departments': 'Fachbereich(e)',
    'agency.form.registrationSettings.postCodeTitle': 'Für welches Gebiet ist die Beratungsstelle sichtbar?',
    'agency.form.registrationSettings.allPostCode': 'Für alle PLZ-Gebiete',
    'agency.form.registrationSettings.onlySelectedPostCodes': 'PLZ-Gebiete definieren',
    'agency.postcode.minimum': 'Die PLZ muss aus 5 Zahlen bestehen.',
    'btn.cancel': 'Abbrechen',
    'form.errors.required': 'Bitte füllen Sie das markierte Feld aus.',
    plsSelect: 'Bitte wählen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    'entityStatus.control': 'Aktiv (eigener Status)',
    'entityStatus.error.assignCounsellor': 'Ordnen Sie der Beratungsstelle zuerst mindestens eine beratende Person zu.',
    'entityStatus.error.save': 'Die Änderung wurde nicht bestätigt. Bitte den Status prüfen und erneut versuchen.',
    'agency.dpaGate.title': 'AVV-Unterschrift erforderlich',
    'agency.dpaGate.description': 'Unterschreiben Sie zuerst den AVV.',
};

const t = (key: string) => translations[key] || key;
// Exercise the real status client; only the remote HTTP transport is replaced.
vi.mock('../../../api/fetchData', async (original) => ({
    ...(await original<typeof import('../../../api/fetchData')>()),
    fetchData: (...args: unknown[]) => mocks.statusHttp(...args),
}));
beforeEach(() => {
    mocks.statusOwnActive = null;
    mocks.tenantTopicsLoading = false;
    mocks.tenantTopicsError = false;
    mocks.statusHttp
        .mockReset()
        .mockImplementation(async ({ url, method, bodyData }: { url: string; method: string; bodyData?: string }) => {
            const id = /agencies\/([^/]+)\/status/.exec(url)?.[1];
            if (!id) throw new Error('Unexpected status authority route');
            if (method === 'PUT') {
                const command = JSON.parse(bodyData ?? '{}');
                if (Object.keys(command).join(',') !== 'active') throw new Error('Status command must stay narrow');
                if (command.active && mocks.hasConsultants === false)
                    return Promise.reject(
                        new Response(null, {
                            status: 400,
                            headers: { 'X-Reason': 'AGENCY_CONTAINS_NO_CONSULTANTS' },
                        }),
                    );
                if (command.active && mocks.hasConsultants === undefined)
                    return Promise.reject(new Response(null, { status: 502 }));
                mocks.statusOwnActive = command.active;
            }
            const active = mocks.statusOwnActive ?? !mocks.agencyData?.offline;
            return { agencyId: id, active, ownActive: active, restrictions: [] };
        });
});
const statusWrites = () => mocks.statusHttp.mock.calls.filter(([request]) => request.method === 'PUT');
const startStatusActivation = async (user: ReturnType<typeof userEvent.setup>) => {
    await waitFor(() => expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'));
    await user.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
    await user.click(screen.getByRole('switch', { name: 'Aktiv (eigener Status)' }));
    await user.click(within(screen.getByTestId('entity-status-save')).getByRole('button'));
};

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
    Card: function Card({
        children,
        titleKey,
        cardTitleChildren,
        footer,
    }: {
        children: React.ReactNode;
        titleKey: string;
        cardTitleChildren?: React.ReactNode;
        footer?: React.ReactNode;
    }) {
        return (
            <section>
                <h2>{t(titleKey)}</h2>
                {cardTitleChildren}
                {children}
                {footer}
            </section>
        );
    },
}));

vi.mock('../../../components/CardEditable', () => ({
    CardEditable: function CardEditable({
        children,
        initialValues,
        onSave,
        titleKey,
    }: {
        children: any;
        initialValues?: object;
        onSave?: (data: unknown, options: { onError: () => void }) => void;
        titleKey?: string;
    }) {
        return (
            <Form
                initialValues={initialValues}
                onFinish={(values) => onSave?.(values, { onError: mocks.cardSaveOnError })}
            >
                {typeof children === 'function'
                    ? children({ editing: true, form: undefined, startEditing: vi.fn() })
                    : children}
                {onSave && <button type="submit">{`${t(titleKey)} save`}</button>}
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
vi.mock('../../../components/Tenants/LegalSettings/components/AgencyLegalTextContainer', () => ({
    AgencyLegalTextContainer: (props: unknown) => {
        mocks.agencyLegalProps = props;
        return <div data-testid="agency-legal-text" />;
    },
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
    useAgencyUpdate: () => ({ mutate: mocks.mutate, mutateAsync: mocks.mutateAsync, isPending: mocks.isAgencySaving }),
}));

vi.mock('../../../hooks/useAgencyLegalDataMissing', () => ({
    useAgencyLegalDataMissing: () => false,
}));

vi.mock('../../../hooks/useAgencyConsultants', () => ({
    AGENCY_CONSULTANTS_KEY: 'AGENCY_CONSULTANTS',
    useAgencyConsultants: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('../../../hooks/useAgencyHasConsultants', () => ({
    useAgencyHasConsultants: () => ({ data: mocks.hasConsultants, isLoading: false }),
}));

vi.mock('../../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => ({
        data: mocks.tenantTopicsLoading ? undefined : mocks.tenantTopics,
        isLoading: mocks.tenantTopicsLoading,
        isError: mocks.tenantTopicsError,
    }),
}));

vi.mock('../../../hooks/useConsultantsOrAdminsData', () => ({
    useConsultantsOrAdminsData: (props: { filters?: unknown; enabled?: boolean; rethrowOnFailure?: boolean }) => {
        const [, rerender] = React.useReducer((count: number) => count + 1, 0);
        React.useEffect(() => {
            mocks.consultantSearchListeners.add(rerender);
            return () => {
                mocks.consultantSearchListeners.delete(rerender);
            };
        }, []);
        mocks.consultantSearchFilters.push(props.filters);
        mocks.consultantSearchCalls.push(props);
        const tenantKey = String((props.filters as { tenantId?: string } | undefined)?.tenantId);
        const byTenant = props.enabled !== false ? mocks.consultantSearchByTenant[tenantKey] : undefined;
        if (byTenant === 'pending') {
            return { data: undefined, isLoading: true, isError: false, refetch: mocks.consultantSearchRefetch };
        }
        // A disabled query has no data; a failed one (rethrowOnFailure) has none either.
        const failed = byTenant === 'failed' || (mocks.consultantSearchFailed && props.rethrowOnFailure);
        const hasData = props.enabled !== false && !failed;
        return {
            data: hasData ? { data: mocks.consultants } : undefined,
            isLoading: false,
            isError: props.enabled !== false && (byTenant === 'failed' || mocks.consultantSearchFailed),
            refetch: mocks.consultantSearchRefetch,
        };
    },
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => true }),
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
    parseUserAuthInfo: () => ({ tenantId: mocks.authTenantId }),
}));

describe('AgencyPageEdit create flow', () => {
    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.mutateAsync.mockReset().mockResolvedValue(undefined);
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
        mocks.tenantTopics = [];
        mocks.consultants = [];
        mocks.hasConsultants = false;
        mocks.cardSaveOnError.mockReset();
        mocks.legalForm.setFields.mockReset();
        mocks.legalForm.scrollToField.mockReset();
        mocks.agencyLegalProps = undefined;
        mocks.isAgencySaving = false;
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

    it('names the missing required field in a notification when the save is blocked', async () => {
        const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => undefined as never);
        renderWithClient(<AgencyPageEdit />);

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neue Beratungsstelle' } });
        fireEvent.change(screen.getByLabelText('PLZ'), { target: { value: '86161' } });
        fireEvent.change(screen.getByLabelText('Stadt'), { target: { value: 'Augsburg' } });
        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

        // Without this the only feedback is the inline marker on a field that sits
        // below the fold — from the top of the form, Save looked like a no-op.
        await waitFor(
            () =>
                expect(notificationSpy).toHaveBeenCalledWith({
                    message:
                        'Die Beratungsstelle wurde nicht gespeichert. Bitte füllen Sie die markierten Pflichtfelder aus:',
                    description: 'Trägerzuordnung',
                    duration: 8,
                }),
            { timeout: 5000 },
        );
        expect(mocks.mutate).not.toHaveBeenCalled();
        notificationSpy.mockRestore();
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

    it('gives the agency legal editor an awaited publication callback', async () => {
        mocks.routeId = '282';
        mocks.agencyData = { id: 282, name: 'E2E Agency', tenantId: 84, topics: [], content: {} };
        let finishUpdate: () => void = () => undefined;
        mocks.mutateAsync.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finishUpdate = resolve;
                }),
        );
        renderWithClient(<AgencyPageEdit section="legal" />);

        await waitFor(() => expect(mocks.agencyLegalProps).toBeDefined());
        let settled = false;
        const publication = mocks.agencyLegalProps
            .onSaveAgencyWide({ content: { privacy: { de: '<p>normalized</p>' } } })
            .then(() => {
                settled = true;
            });
        await Promise.resolve();
        expect(settled).toBe(false);
        expect(mocks.mutateAsync).toHaveBeenCalledWith({
            content: { privacy: { de: '<p>normalized</p>' } },
        });

        finishUpdate();
        await publication;
        expect(settled).toBe(true);
    });

    it('hands the pending agency update to the legal editor as saving', async () => {
        mocks.routeId = '282';
        mocks.agencyData = { id: 282, name: 'E2E Agency', tenantId: 84, topics: [], content: {} };
        mocks.isAgencySaving = true;
        renderWithClient(<AgencyPageEdit section="legal" />);
        await waitFor(() => expect(mocks.agencyLegalProps?.saving).toBe(true));
    });

    it('reports a rejected agency-wide publication and rethrows it to the legal editor', async () => {
        const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => undefined as never);
        mocks.routeId = '282';
        mocks.agencyData = { id: 282, name: 'E2E Agency', tenantId: 84, topics: [], content: {} };
        const rejection = new Response(null, { status: 400 });
        mocks.mutateAsync.mockRejectedValue(rejection);
        renderWithClient(<AgencyPageEdit section="legal" />);

        await waitFor(() => expect(mocks.agencyLegalProps).toBeDefined());
        await expect(
            mocks.agencyLegalProps.onSaveAgencyWide({ content: { privacy: { de: '<p>x</p>' } } }),
        ).rejects.toBe(rejection);
        expect(notificationSpy).toHaveBeenCalledWith({ message: 'message.error.default', duration: 8 });
        notificationSpy.mockRestore();
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

const TOPIC = { id: 7, name: 'Debt counselling', status: 'ACTIVE' };
const CONSULTANT = { id: 1, firstname: 'Erika', lastname: 'Beispiel', email: 'erika@example.org', tenantId: '7' };
const FOREIGN_CONSULTANT = {
    id: 2,
    firstname: 'Fremd',
    lastname: 'Mandant',
    email: 'fremd@example.org',
    tenantId: '99',
};
const CONSULTANT_LABEL = 'Erika Beispiel erika@example.org';

// user-event's pointer-events check walks every ancestor's computed style on
// each pointer action; nothing here relies on pointer-events: none, so skip it.
const setupUser = () => userEvent.setup({ delay: null, pointerEventsCheck: PointerEventsCheckLevel.Never });

const fillRequiredCreateFields = async (user: ReturnType<typeof userEvent.setup>) => {
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neue Beratungsstelle' } });
    fireEvent.change(screen.getByLabelText('PLZ'), { target: { value: '86161' } });
    fireEvent.change(screen.getByLabelText('Stadt'), { target: { value: 'Augsburg' } });

    await user.click(screen.getByRole('combobox', { name: /Trägerzuordnung/ }));
    await user.click(await screen.findByRole('option', { name: 'Caritas Augsburg' }));
};

const assignConsultant = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('combobox', { name: 'Berater:innen hinzufügen' }));
    await user.click(await screen.findByRole('option', { name: CONSULTANT_LABEL }));
};

const goLiveWithTopicsAvailable = async (user: ReturnType<typeof userEvent.setup>) => {
    mocks.tenantTopics = [TOPIC];
    mocks.consultants = [CONSULTANT];
    renderWithClient(<AgencyPageEdit />);
    await fillRequiredCreateFields(user);
    await assignConsultant(user);
    await user.click(screen.getByRole('switch', { name: 'Sichtbar stellen' }));
};

// The full page with AntD selects takes 20-30 s on the parallel CI runner.
describe('AgencyPageEdit no-topic activation confirm', { timeout: 60_000 }, () => {
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
        mocks.tenantTopics = [];
        mocks.consultants = [];
        mocks.hasConsultants = false;
        mocks.consultantSearchFilters = [];
        mocks.consultantSearchCalls = [];
        mocks.consultantSearchFailed = false;
        mocks.consultantSearchRefetch.mockReset();
        mocks.authTenantId = 0;
        mocks.cardSaveOnError.mockReset();
    });

    it('shows the confirm dialog and does not save when going live without a topic', async () => {
        const user = setupUser();
        await goLiveWithTopicsAvailable(user);

        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Kein Thema ausgewählt')).toBeInTheDocument();
        expect(
            within(dialog).getByText('Sie haben kein Thema ausgewählt. Möchten Sie die Beratung trotzdem aktivieren?'),
        ).toBeInTheDocument();
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('keeps the form values and does not save when the no-topic dialog is cancelled', async () => {
        const user = setupUser();
        await goLiveWithTopicsAvailable(user);

        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Name')).toHaveValue('Neue Beratungsstelle');
        expect(screen.getByRole('switch', { name: 'Sichtbar stellen' })).toBeChecked();
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    });

    it('saves offline:false and empty topicIds when the no-topic dialog is confirmed', async () => {
        const user = setupUser();
        await goLiveWithTopicsAvailable(user);

        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Trotzdem aktivieren' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(mocks.mutate.mock.calls[0][0]).toEqual(expect.objectContaining({ offline: false, topicIds: [] }));
    });

    it('saves without a dialog when going live with a topic selected', async () => {
        const user = setupUser();
        await goLiveWithTopicsAvailable(user);

        await user.click(screen.getByRole('combobox', { name: /Fachbereich/ }));
        await user.click(await screen.findByRole('option', { name: 'Debt counselling' }));
        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mocks.mutate.mock.calls[0][0]).toEqual(expect.objectContaining({ offline: false, topicIds: ['7'] }));
    });

    it('does not warn when an already-online agency is saved without topics', async () => {
        const user = setupUser();
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [CONSULTANT];
        mocks.agencyData = {
            id: 282,
            name: 'Bestehende Stelle',
            postcode: '86161',
            city: 'Augsburg',
            offline: false,
            topics: [],
            tenantId: 7,
            consultantIds: [{ value: '1', label: CONSULTANT_LABEL }],
        };

        renderWithClient(<AgencyPageEdit />);

        expect(await screen.findByDisplayValue('Bestehende Stelle')).toBeInTheDocument();
        // The create-route consultant effect forces online off on first paint. Turn it
        // back on: this is still not an activation because initialValues.online is true.
        const toggle = screen.getByRole('switch', { name: 'Sichtbar stellen' });
        expect(toggle).not.toBeDisabled();
        await user.click(toggle);
        fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mocks.mutate.mock.calls[0][0]).toEqual(expect.objectContaining({ offline: false, topicIds: [] }));
    });

    const renderOfflineAgencyEdit = (topics: Array<{ id: number; name: string }> = []) => {
        mocks.routeId = '282';
        mocks.tenantTopics = [TOPIC];
        mocks.hasConsultants = true;
        mocks.agencyData = {
            id: 282,
            name: 'Bestehende Stelle',
            offline: true,
            topics,
            tenantId: 7,
        };
        return renderWithClient(<AgencyPageEdit />);
    };

    it('shows the no-topic dialog before a dedicated status command', async () => {
        const user = setupUser();
        renderOfflineAgencyEdit();
        await startStatusActivation(user);
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(statusWrites()).toHaveLength(0);
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('keeps status editing and sends no PUT when no-topic activation is cancelled', async () => {
        const user = setupUser();
        renderOfflineAgencyEdit();
        await startStatusActivation(user);
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(statusWrites()).toHaveLength(0);
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(screen.getByRole('switch', { name: 'Aktiv (eigener Status)' })).toBeChecked();
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        expect(within(screen.getByTestId('entity-status-save')).getByRole('button')).toBeEnabled();
    });

    it('confirms no-topic activation through a narrow status PUT and authoritative readback', async () => {
        const user = setupUser();
        renderOfflineAgencyEdit();
        await startStatusActivation(user);
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: 'Trotzdem aktivieren' }));
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        expect(statusWrites()).toHaveLength(1);
        expect(JSON.parse(statusWrites()[0][0].bodyData)).toEqual({ active: true });
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('defers activation while offered topics load, then requires confirmation before any status PUT', async () => {
        const user = setupUser();
        mocks.tenantTopicsLoading = true;
        const page = renderOfflineAgencyEdit();
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        await user.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
        await user.click(screen.getByRole('switch', { name: 'Aktiv (eigener Status)' }));
        const save = within(screen.getByTestId('entity-status-save')).getByRole('button');
        expect(save).toBeDisabled();
        expect(screen.getByTestId('entity-status-activation-blocked')).toHaveTextContent(
            'entityStatus.activationTopicsLoading',
        );
        await user.click(save);
        expect(statusWrites()).toHaveLength(0);
        mocks.tenantTopicsLoading = false;
        page.rerender(<AgencyPageEdit />);
        await waitFor(() => expect(save).toBeEnabled());
        await user.click(save);
        const dialog = await screen.findByRole('dialog');
        expect(statusWrites()).toHaveLength(0);
        await user.click(within(dialog).getByRole('button', { name: 'Trotzdem aktivieren' }));
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        expect(statusWrites()).toHaveLength(1);
    });

    it('keeps activation blocked with an explicit topics error until the lookup recovers', async () => {
        const user = setupUser();
        mocks.tenantTopicsError = true;
        const page = renderOfflineAgencyEdit();
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        await user.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
        await user.click(screen.getByRole('switch', { name: 'Aktiv (eigener Status)' }));
        expect(within(screen.getByTestId('entity-status-save')).getByRole('button')).toBeDisabled();
        expect(screen.getByTestId('entity-status-activation-blocked')).toHaveTextContent(
            'entityStatus.activationTopicsError',
        );
        expect(statusWrites()).toHaveLength(0);
        mocks.tenantTopicsError = false;
        page.rerender(<AgencyPageEdit />);
        await waitFor(() => expect(within(screen.getByTestId('entity-status-save')).getByRole('button')).toBeEnabled());
    });

    it('allows pausing an active centre while topics are still loading', async () => {
        const user = setupUser();
        mocks.tenantTopicsLoading = true;
        mocks.statusOwnActive = true;
        mocks.tenantTopicsLoading = true;
        renderOfflineAgencyEdit();
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        await user.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
        await user.click(screen.getByRole('switch', { name: 'Aktiv (eigener Status)' }));
        await user.click(within(screen.getByTestId('entity-status-save')).getByRole('button'));
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false'),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(JSON.parse(statusWrites()[0][0].bodyData)).toEqual({ active: false });
    });

    it('does not ask again for an unchanged active own status even when ordinary metadata is stale', async () => {
        const user = setupUser();
        mocks.statusOwnActive = true;
        mocks.tenantTopicsLoading = true;
        renderOfflineAgencyEdit();
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        expect(mocks.agencyData.offline).toBe(true);
        await user.click(within(screen.getByTestId('entity-status-edit')).getByRole('button'));
        await user.click(within(screen.getByTestId('entity-status-save')).getByRole('button'));
        await waitFor(() => expect(screen.getByTestId('entity-status-edit')).toBeInTheDocument());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(statusWrites()).toHaveLength(1);
        expect(JSON.parse(statusWrites()[0][0].bodyData)).toEqual({ active: true });
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('cancels approval when navigation selects another centre and never sends a stale status command', async () => {
        const user = setupUser();
        const page = renderOfflineAgencyEdit();
        await startStatusActivation(user);
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        mocks.routeId = '283';
        mocks.agencyData = { ...mocks.agencyData, id: 283, name: 'Andere Stelle' };
        page.rerender(<AgencyPageEdit />);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByTestId('entity-status-context')).toHaveTextContent('Andere Stelle'));
        expect(statusWrites()).toHaveLength(0);
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
    });

    it('writes status without a dialog when the centre already has a persisted topic', async () => {
        const user = setupUser();
        renderOfflineAgencyEdit([{ id: 7, name: 'Debt counselling' }]);
        await startStatusActivation(user);
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(statusWrites()).toHaveLength(1);
        expect(JSON.parse(statusWrites()[0][0].bodyData)).toEqual({ active: true });
        expect(mocks.mutate).not.toHaveBeenCalled();
    });
});

describe('AgencyPageEdit registration visibility needs a counsellor', () => {
    const NEEDS_CONSULTANT =
        'Wählen Sie mindestens eine:n Berater:in aus, bevor Sie die Beratungsstelle in der Registrierung sichtbar machen.';

    const saveRegistrationCard = () => {
        fireEvent.click(screen.getByRole('button', { name: 'Sichtbarkeit in der Registrierung save' }));
    };

    const renderAgencyWithoutAssignedConsultants = () => {
        mocks.routeId = '282';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [CONSULTANT];
        mocks.hasConsultants = false;
        mocks.agencyData = {
            id: 282,
            name: 'Bestehende Stelle',
            offline: true,
            topics: [TOPIC],
            tenantId: 7,
        };
        renderWithClient(<AgencyPageEdit />);
    };

    beforeEach(() => {
        mocks.mutate.mockReset();
        mocks.navigate.mockReset();
        mocks.searchTenantData.mockReset();
        mocks.searchTenantData.mockResolvedValue({ data: [{ id: 7, name: 'Caritas Augsburg' }] });
        mocks.userRoles = {
            hasRole: () => true,
            isSuperAdmin: true,
            isTechnicalAccount: false,
            isTenantScopedAdmin: false,
            roles: [],
            tenantId: 0,
        };
        mocks.dpaGate = { dpaPublished: true, dpaSigned: true };
        mocks.agencyData = undefined;
        mocks.createConsultantProps = undefined;
        mocks.tenantTopics = [];
        mocks.consultants = [];
        mocks.hasConsultants = false;
        mocks.cardSaveOnError.mockReset();
    });

    it('lets status be requested and explains the authoritative missing-counsellor refusal', async () => {
        const user = setupUser();
        renderAgencyWithoutAssignedConsultants();
        await startStatusActivation(user);
        expect(await screen.findByTestId('entity-status-error')).toHaveTextContent(
            'Ordnen Sie der Beratungsstelle zuerst mindestens eine beratende Person zu.',
        );
        expect(statusWrites()).toHaveLength(1);
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('does not claim activation when the owning prerequisite authority has not answered', async () => {
        const user = setupUser();
        renderAgencyWithoutAssignedConsultants();
        mocks.hasConsultants = undefined;
        await startStatusActivation(user);
        expect(await screen.findByTestId('entity-status-error')).toHaveTextContent(
            translations['entityStatus.error.save'],
        );
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('still saves registration metadata when lookup is unknown without issuing a status command', async () => {
        mocks.routeId = '282';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [CONSULTANT];
        mocks.hasConsultants = undefined;
        mocks.agencyData = { id: 282, name: 'Bestehende Stelle', offline: false, topics: [TOPIC], tenantId: 7 };
        renderWithClient(<AgencyPageEdit />);
        fireEvent.click(screen.getByRole('button', { name: 'Sichtbarkeit in der Registrierung save' }));
        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(statusWrites()).toHaveLength(0);
        expect(screen.queryByText(NEEDS_CONSULTANT)).not.toBeInTheDocument();
    });

    it('offers no counsellor to a platform admin until the Träger is chosen', async () => {
        mocks.routeId = 'add';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [CONSULTANT, FOREIGN_CONSULTANT];
        mocks.hasConsultants = false;
        renderWithClient(<AgencyPageEdit />);

        // Every Träger's counsellors came back here before; nobody may be picked blind.
        expect(await screen.findByRole('combobox', { name: 'Berater:innen hinzufügen' })).toBeDisabled();
        expect(screen.getByText(/Wählen Sie zuerst die Trägerzuordnung/)).toBeInTheDocument();
    });

    it('asks the backend for the chosen Träger only and offers just its counsellors', async () => {
        const user = setupUser();
        mocks.routeId = 'add';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [CONSULTANT, FOREIGN_CONSULTANT];
        mocks.hasConsultants = false;
        renderWithClient(<AgencyPageEdit />);

        await fillRequiredCreateFields(user);
        await user.click(screen.getByRole('combobox', { name: 'Berater:innen hinzufügen' }));

        expect(await screen.findByRole('option', { name: CONSULTANT_LABEL })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Fremd Mandant/ })).not.toBeInTheDocument();
        expect(mocks.consultantSearchFilters.at(-1)).toEqual({ tenantId: '7' });
    });

    it('does not ask the server for counsellors until the Träger is chosen', async () => {
        mocks.routeId = 'add';
        mocks.consultants = [CONSULTANT, FOREIGN_CONSULTANT];
        renderWithClient(<AgencyPageEdit />);

        await screen.findByRole('combobox', { name: 'Berater:innen hinzufügen' });
        expect(mocks.consultantSearchCalls.length).toBeGreaterThan(0);
        expect(mocks.consultantSearchCalls.every(({ enabled }) => enabled === false)).toBe(true);
    });

    it('offers a Träger admin only their own counsellors from the start on a new centre', async () => {
        const user = setupUser();
        mocks.routeId = 'add';
        mocks.tenantTopics = [TOPIC];
        mocks.authTenantId = 7;
        mocks.userRoles = {
            hasRole: () => true,
            isSuperAdmin: false,
            isTechnicalAccount: false,
            isTenantScopedAdmin: true,
            roles: [],
            tenantId: 7,
        };
        mocks.consultants = [CONSULTANT, FOREIGN_CONSULTANT];
        renderWithClient(<AgencyPageEdit />);

        const picker = await screen.findByRole('combobox', { name: 'Berater:innen hinzufügen' });
        expect(picker).toBeEnabled();
        await user.click(picker);

        expect(await screen.findByRole('option', { name: CONSULTANT_LABEL })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Fremd Mandant/ })).not.toBeInTheDocument();
        expect(mocks.consultantSearchFilters.at(-1)).toEqual({ tenantId: '7' });
    });

    it('shows an error with a retry, not the empty hint, when the counsellor search fails', async () => {
        const user = setupUser();
        mocks.routeId = 'add';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [CONSULTANT];
        mocks.consultantSearchFailed = true;
        // The retry succeeds: the hook stops failing and answers with the Träger's counsellors.
        mocks.consultantSearchRefetch.mockImplementation(() => {
            mocks.consultantSearchFailed = false;
            mocks.consultantSearchListeners.forEach((rerender) => rerender());
        });
        renderWithClient(<AgencyPageEdit />);

        await fillRequiredCreateFields(user);

        expect(await screen.findByText('Die Berater:innen konnten nicht geladen werden.')).toBeInTheDocument();
        expect(screen.queryByText(/keine weiteren Berater:innen/)).not.toBeInTheDocument();
        expect(mocks.consultantSearchCalls.at(-1)?.rethrowOnFailure).toBe(true);

        await user.click(screen.getByRole('button', { name: 'Erneut laden' }));
        expect(mocks.consultantSearchRefetch).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(screen.queryByText('Die Berater:innen konnten nicht geladen werden.')).not.toBeInTheDocument(),
        );
        await user.click(screen.getByRole('combobox', { name: 'Berater:innen hinzufügen' }));
        expect(await screen.findByRole('option', { name: CONSULTANT_LABEL })).toBeInTheDocument();
    });

    it.each(['pending', 'failed'] as const)(
        'drops the counsellor of the old Träger as soon as the Träger changes, while the new search is %s',
        async (newTenantSearch) => {
            const user = setupUser();
            mocks.routeId = 'add';
            mocks.tenantTopics = [TOPIC];
            mocks.consultants = [CONSULTANT, FOREIGN_CONSULTANT];
            mocks.hasConsultants = false;
            mocks.searchTenantData.mockResolvedValue({
                data: [
                    { id: 7, name: 'Caritas Augsburg' },
                    { id: 8, name: 'Caritas Berlin' },
                ],
            });
            // Träger 8 has not answered (or cannot): the old pick must not wait for that answer to go.
            mocks.consultantSearchByTenant = { '8': newTenantSearch };
            renderWithClient(<AgencyPageEdit />);

            await fillRequiredCreateFields(user);
            await assignConsultant(user);
            await user.keyboard('{Escape}');
            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            expect(screen.getByText(CONSULTANT_LABEL)).toBeInTheDocument();

            await user.click(screen.getByRole('combobox', { name: /Trägerzuordnung/ }));
            await user.click(await screen.findByRole('option', { name: 'Caritas Berlin' }));

            await waitFor(() => expect(screen.queryByText(CONSULTANT_LABEL)).not.toBeInTheDocument());
            expect(mocks.consultantSearchFilters.at(-1)).toEqual({ tenantId: '8' });

            fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
            await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
            const saved = mocks.mutate.mock.calls[0][0] as { tenantId?: unknown; consultantIds?: unknown[] };
            expect(JSON.stringify(saved.tenantId)).toContain('8');
            // Nothing of Träger 7 may reach addAgencyData -> assignAgencyToConsultants for Träger 8.
            expect(saved.consultantIds ?? []).toEqual([]);
        },
    );

    it('keeps a stored counsellor when the search fails', async () => {
        mocks.routeId = '282';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [];
        mocks.consultantSearchFailed = true;
        mocks.hasConsultants = true;
        mocks.agencyData = {
            id: 282,
            name: 'Bestehende Stelle',
            offline: true,
            topics: [TOPIC],
            tenantId: 7,
            consultantIds: [{ value: '1', label: CONSULTANT_LABEL }],
        };
        renderWithClient(<AgencyPageEdit />);

        expect(await screen.findByText('Die Berater:innen konnten nicht geladen werden.')).toBeInTheDocument();
        expect(screen.getByText(CONSULTANT_LABEL)).toBeInTheDocument();
    });

    it('says so when the chosen Träger has no counsellor left to offer', async () => {
        const user = setupUser();
        mocks.routeId = 'add';
        mocks.tenantTopics = [TOPIC];
        mocks.consultants = [FOREIGN_CONSULTANT];
        mocks.hasConsultants = false;
        renderWithClient(<AgencyPageEdit />);

        await fillRequiredCreateFields(user);

        expect(
            await screen.findByText('In diesem Träger gibt es keine weiteren Berater:innen zur Auswahl.'),
        ).toBeInTheDocument();
    });

    it('does not offer a counsellor from another tenant', async () => {
        const user = setupUser();
        mocks.routeId = '282';
        mocks.tenantTopics = [TOPIC];
        // The platform admin's consultant search spans tenants; the agency belongs to tenant 7.
        mocks.consultants = [CONSULTANT, FOREIGN_CONSULTANT];
        mocks.hasConsultants = false;
        mocks.agencyData = { id: 282, name: 'Bestehende Stelle', offline: true, topics: [TOPIC], tenantId: 7 };
        renderWithClient(<AgencyPageEdit />);

        await user.click(await screen.findByRole('combobox', { name: 'Berater:innen hinzufügen' }));

        expect(await screen.findByRole('option', { name: CONSULTANT_LABEL })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Fremd Mandant/ })).not.toBeInTheDocument();
    });

    it('warns on failed assignment and still refuses a separate status activation', async () => {
        const user = setupUser();
        const warn = vi.spyOn(notification, 'warning').mockImplementation(() => undefined as never);
        const success = vi.spyOn(notification, 'success').mockImplementation(() => undefined as never);
        mocks.mutate.mockImplementation((_data, options) =>
            options?.onSuccess?.({ id: 282, consultantAssignmentFailed: true }),
        );
        renderAgencyWithoutAssignedConsultants();
        await assignConsultant(user);
        saveRegistrationCard();
        await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
        expect(warn.mock.calls[0][0]).toEqual(
            expect.objectContaining({ message: 'message.agency.consultantAssignmentFailed' }),
        );
        expect(success).toHaveBeenCalledTimes(1);
        await startStatusActivation(user);
        expect(await screen.findByTestId('entity-status-error')).toHaveTextContent(
            'Ordnen Sie der Beratungsstelle zuerst mindestens eine beratende Person zu.',
        );
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        warn.mockRestore();
        success.mockRestore();
    });

    it('saves the assignment first and activates only after the owning backend confirms staffing', async () => {
        const user = setupUser();
        renderAgencyWithoutAssignedConsultants();
        await assignConsultant(user);
        saveRegistrationCard();
        await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
        expect(mocks.mutate.mock.calls[0][0].consultantIds).toHaveLength(1);
        await startStatusActivation(user);
        expect(await screen.findByTestId('entity-status-error')).toHaveTextContent(
            'Ordnen Sie der Beratungsstelle zuerst mindestens eine beratende Person zu.',
        );
        expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'false');
        mocks.hasConsultants = true;
        await user.click(within(screen.getByTestId('entity-status-save')).getByRole('button'));
        await waitFor(() =>
            expect(screen.getByTestId('entity-status-confirmed')).toHaveAttribute('data-active', 'true'),
        );
        expect(JSON.parse(statusWrites()[1][0].bodyData)).toEqual({ active: true });
    });
});
