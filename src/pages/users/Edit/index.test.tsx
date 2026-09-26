import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserEditOrAdd } from './index';
import { UserRole } from '../../../enums/UserRole';
import { Resource } from '../../../enums/Resource';

/**
 * Behavioural tests for the consultant create/edit form.
 *
 * They render `UserEditOrAdd` and drive it through the DOM instead of reading
 * `index.tsx` as text: a source-text assertion cannot tell whether a field is
 * rendered for the *right* role, nor what the form actually submits. The two
 * things worth protecting here are exactly those — the admin-remarks role gate
 * (#994) and the stable salutation keys (#994) — plus the dual display names
 * (#996), so every assertion below goes through the rendered control and the
 * payload handed to the mutation.
 */

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    navigate: vi.fn(),
    getSingleTenantData: vi.fn(),
    searchTenantData: vi.fn(),
    /** Drives the real `hasRole` logic below, so the role gate is genuinely exercised. */
    roles: [] as string[],
    /**
     * Query results are held as whole objects and swapped per test rather than
     * rebuilt on every hook call. `agenciesData` is an effect dependency in the
     * page, so handing out a fresh object each render would re-run the effect,
     * set fresh state, and spin the component forever — react-query itself
     * returns a stable reference between renders.
     */
    agenciesResult: { data: { data: [] as any[] }, isLoading: false },
    topicsResult: { data: [] as any[], isLoading: false },
    consultantsResult: { data: { data: [] as any[] }, isLoading: false },
    supervisorCandidatesResult: { data: { data: [] as any[] }, isLoading: false, isError: false },
    counselorResult: { data: undefined as any, isLoading: false },
    /** Swapped per test so the same harness can drive the create AND the edit form. */
    params: { id: 'add', typeOfUsers: 'consultants' } as { id: string; typeOfUsers: string },
    canUpdateAgency: true,
    addTopicsToAgency: vi.fn(),
    appSettings: {} as Record<string, unknown>,
}));

const TENANT = { id: 7, name: 'Caritas Augsburg' };

const translations: Record<string, string> = {
    firstname: 'Vorname',
    lastname: 'Nachname',
    email: 'E-Mail',
    'counselor.username': 'Benutzername',
    'counselor.password': 'Passwort',
    'counselor.displayName': 'Öffentlicher Anzeigename',
    'counselor.internalDisplayName': 'Interner Anzeigename',
    'counselor.salutation': 'Anrede',
    'counselor.salutation.option.counsellor_female': 'Beraterin',
    'counselor.salutation.option.counsellor_male': 'Berater',
    'counselor.salutation.option.counselling_person': 'Beratende Person',
    'counselor.salutation.option.counsellor_gender_neutral': 'Berater*in',
    'counselor.salutation.option.not_specified': 'Keine Angabe',
    'counselor.position': 'Funktion',
    'counselor.avatar': 'Avatar',
    'counselor.avatar.hint': 'Initialen oder Symbol.',
    'counselor.avatar.initials': 'Initialen',
    'counselor.avatar.initials.empty': 'Initialen',
    'counselor.avatar.motif': 'Symbol',
    'counselor.personalTitle': 'Titel',
    'counselor.adminRemarks': 'Interne Anmerkungen',
    'counselor.absent': 'Abwesend',
    'counselor.absenceMessage': 'Abwesenheitsnotiz',
    'counselor.assignedSupervisor': 'Fester Supervisor',
    'counselor.assignedSupervisor.loadFailed': 'Liste konnte nicht geladen werden.',
    'counselor.assignedSupervisor.detailsUnavailable': 'Gespeicherte Zuweisung nicht ladbar.',
    'counselor.assignedSupervisor.noCandidates': 'Noch niemand freigegeben.',
    'counselor.assignedSupervisor.truncated': 'Nur die ersten 1000 werden durchsucht.',
    'tenantAdmins.form.tenantAssignment': 'Trägerzuordnung',
    agency: 'Beratungsstelle',
    'topics.title': 'Themen',
    'counselor.topicsAtAgency': 'Themen bei {{agency}}',
    'counselor.topicsAtAgency.notOfferedChip': '{{topic}} – wird hier nicht mehr angeboten',
    'counselor.topicsAtAgency.notOfferedNotice': 'Markierte Themen bietet diese Stelle nicht mehr an.',
    'counselor.topicsAtAgency.notOfferedBlocksChange': 'Erst markierte Themen entfernen.',
    'counselor.topicsLostByMove.title': 'Themen passen nicht zur neuen Beratungsstelle',
    'counselor.topicsLostByMove.text': '{{agency}} bietet nicht an: {{topics}}.',
    'counselor.topicsLostByMove.addToTarget': 'Thema bei {{agency}} ergänzen',
    'counselor.topicsLostByMove.drop': 'Thema weglassen',
    'counselor.topicsLostByMove.createCentre': 'Neue Beratungsstelle anlegen',
    'counselor.topicsLostByMove.noAgencyRight': 'Keine Berechtigung für {{agency}}.',
    'counselor.topicsLostByMove.publicAtTarget': 'Wird danach bei {{agency}} öffentlich angeboten.',
    'counselor.topicsLostByMove.oneTopicPerAgency':
        'Nur ein Thema (Fachbereich) pro Stelle: {{agency}} hat schon eins.',
    'counselor.topicsLostByMove.addForbidden': 'Keine Berechtigung, {{agency}} zu ändern.',
    'counselor.topicsLostByMove.addFailed': 'Hinzufügen fehlgeschlagen.',
    'counselor.topicsLostByMove.settingsUnavailable': 'Gerade nicht prüfbar, bitte erneut versuchen.',
    save: 'Speichern',
    edit: 'Bearbeiten',
    'btn.cancel': 'Abbrechen',
};

const t = (key: string, values?: Record<string, unknown>) =>
    (translations[key] ?? key).replace(/{{(\w+)}}/g, (_match, name) => String(values?.[name] ?? ''));

vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([t, {}, true], { t, i18n: { language: 'de' } }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        // Defaults to the consultant *create* form (`id: 'add'`): nothing is read-only and the
        // save button is available without first unlocking the form. Tests that need the edit
        // form set `mocks.params.id` to a consultant id.
        useParams: () => mocks.params,
    };
});

vi.mock('../../../components/Page', () => {
    const Page = ({ children, isLoading }: { children: React.ReactNode; isLoading?: boolean }) => (
        <div>{isLoading ? 'loading' : children}</div>
    );
    Page.BackWithActions = function PageBackWithActions({ children }: { children: React.ReactNode }) {
        return <div>{children}</div>;
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

vi.mock('../../../components/CreateAgencyModal', () => ({
    CreateAgencyModal: () => <div />,
}));

vi.mock('../../../components/GrantConsultantIdentityModal', () => ({
    GrantConsultantIdentityModal: () => <div />,
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: mocks.roles,
        hasRole: (role: string | string[]) =>
            (Array.isArray(role) ? role : [role]).some((candidate) => mocks.roles.includes(candidate)),
        // Not a super admin, so the tenant is taken from the token instead of
        // being picked in the form — see `parseUserAuthInfo` below.
        isSuperAdmin: false,
        isTechnicalAccount: false,
        isTenantScopedAdmin: mocks.roles.includes(UserRole.TenantAdmin),
        tenantId: TENANT.id,
        tokenUnreadable: false,
    }),
}));

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        permissions: {},
        can: (_action: string, resource: Resource) => resource !== Resource.Agency || mocks.canUpdateAgency,
    }),
}));

vi.mock('../../../hooks/useAddOrUpdateConsultantOrAgencyAdmin', () => ({
    useAddOrUpdateConsultantOrAdmin: () => ({ mutate: mocks.mutate }),
}));

vi.mock('../../../hooks/useConsultantsOrAdminsData', () => ({
    // The page runs this hook twice: once searching for the edited consultant (`search: id`) and
    // once, unsearched, for the supervisor candidates. They have to be distinguishable, otherwise
    // a candidate-query failure cannot be simulated at all.
    useConsultantsOrAdminsData: (args: { search?: string }) =>
        args?.search ? mocks.consultantsResult : mocks.supervisorCandidatesResult,
}));

vi.mock('../../../hooks/useAgencysData', () => ({
    useAgenciesData: () => mocks.agenciesResult,
}));

vi.mock('../../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => mocks.topicsResult,
}));

vi.mock('../../../hooks/useCounselorById', () => ({
    useCounselorById: () => mocks.counselorResult,
}));

vi.mock('../../../api/agency/addTopicsToAgency', async () => {
    const actual = await vi.importActual<typeof import('../../../api/agency/addTopicsToAgency')>(
        '../../../api/agency/addTopicsToAgency',
    );
    return { ...actual, addTopicsToAgency: mocks.addTopicsToAgency };
});

vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: mocks.appSettings }),
}));

vi.mock('../../../api/tenant/searchTenantData', () => ({
    searchTenantData: mocks.searchTenantData,
}));

vi.mock('../../../api/tenant/getSingleTenantData', () => ({
    getSingleTenantData: mocks.getSingleTenantData,
}));

vi.mock('../../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: () => ({ tenantId: TENANT.id }),
}));

beforeAll(() => {
    // MUI's Autocomplete popper measures and scrolls its list; neither is
    // implemented in jsdom.
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
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

const renderForm = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <UserEditOrAdd />
        </QueryClientProvider>,
    );
};

/**
 * Sets a text field in one change event. `user.type` would re-render this
 * (large) form once per keystroke, which makes the suite minutes-slow for no
 * extra coverage — the controls under test are driven with real clicks below.
 */
const setField = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Everything the create form insists on before it will submit. */
const fillMandatoryFields = async () => {
    setField('Vorname', 'Ada');
    setField('Nachname', 'Lovelace');
    setField('E-Mail', 'ada.lovelace@example.org');
    setField('Benutzername', 'ada-lovelace');
    setField('Passwort', 'Str0ng!Pass');
    // The tenant is not picked in the form for a non-super-admin; it arrives
    // from the token via getSingleTenantData. Wait for that before submitting,
    // otherwise the required `tenantId` rule rejects the submission.
    await waitFor(() => expect(mocks.getSingleTenantData).toHaveBeenCalledWith(TENANT.id));
};

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
    return mocks.mutate.mock.calls[0][0];
};

/** Picks `optionLabel` in the MUI Autocomplete labelled `fieldLabel`. */
const chooseOption = async (
    user: ReturnType<typeof userEvent.setup>,
    fieldLabel: string,
    optionLabel: string,
): Promise<void> => {
    await user.click(screen.getByLabelText(fieldLabel));
    await user.click(await screen.findByRole('option', { name: optionLabel }));
};

beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.navigate.mockReset();
    mocks.searchTenantData.mockReset();
    mocks.searchTenantData.mockResolvedValue({ data: [TENANT] });
    mocks.getSingleTenantData.mockReset();
    mocks.getSingleTenantData.mockResolvedValue(TENANT);
    mocks.roles = [UserRole.TenantAdmin];
    mocks.agenciesResult = { data: { data: [] }, isLoading: false };
    mocks.topicsResult = { data: [], isLoading: false };
    mocks.consultantsResult = { data: { data: [] }, isLoading: false };
    mocks.supervisorCandidatesResult = { data: { data: [] }, isLoading: false, isError: false };
    mocks.counselorResult = { data: undefined, isLoading: false };
    mocks.params = { id: 'add', typeOfUsers: 'consultants' };
    mocks.canUpdateAgency = true;
    mocks.addTopicsToAgency.mockReset();
    mocks.addTopicsToAgency.mockResolvedValue(undefined);
    mocks.appSettings = {};
});

describe('admin remarks are gated on the tenant-level admin role (#994)', () => {
    it.each([
        ['a tenant admin', UserRole.TenantAdmin],
        ['a single-tenant admin', UserRole.SingleTenantAdmin],
    ])('renders the remarks field for %s and submits what was typed into it', async (_label, role) => {
        mocks.roles = [role];
        const user = userEvent.setup();
        renderForm();

        const remarks = screen.getByLabelText('Interne Anmerkungen');
        fireEvent.change(remarks, { target: { value: 'Springt fuer die Kollegin ein.' } });
        await fillMandatoryFields();

        expect(await submit(user)).toMatchObject({ adminRemarks: 'Springt fuer die Kollegin ein.' });
    });

    it.each([
        ['a restricted agency admin', UserRole.RestrictedAgencyAdmin],
        ['a plain agency admin', UserRole.AgencyAdmin],
    ])('omits the remarks field for %s, whose submission carries no remarks', async (_label, role) => {
        // The backend refuses to read or write remarks for these roles, so the
        // field must be absent — not merely disabled. Visibility alone would
        // not prove it: a regression can hide the control and still serialize
        // `adminRemarks`, so the payload is asserted as well.
        mocks.roles = [role];
        const user = userEvent.setup();
        renderForm();

        expect(screen.queryByLabelText('Interne Anmerkungen')).not.toBeInTheDocument();

        await fillMandatoryFields();

        expect(await submit(user)).not.toHaveProperty('adminRemarks');
    });
});

describe('salutation control (#994)', () => {
    it('submits the stable key behind the chosen label, not the label itself', async () => {
        const user = userEvent.setup();
        renderForm();

        await chooseOption(user, 'Anrede', 'Beratende Person');
        await fillMandatoryFields();

        expect(await submit(user)).toMatchObject({ salutation: 'counselling_person' });
    });

    it('offers "no salutation" as a selectable key rather than a clear affordance', async () => {
        // Clearing the control yields `undefined`, which the API layer omits and
        // the backend reads as "leave unchanged" — the clear button would
        // silently fail to persist. `not_specified` is the explicit way to say it.
        const user = userEvent.setup();
        renderForm();

        await chooseOption(user, 'Anrede', 'Keine Angabe');

        const salutation = screen.getByLabelText('Anrede');
        expect(salutation).toHaveValue('Keine Angabe');
        // MUI only renders the clear button once a value is set, so this is
        // checked with the control populated. Asked for by accessible name
        // (MUI's `clearText`, "Clear") instead of the implementation class the
        // indicator happens to carry today. The sibling popup toggle is
        // asserted first so the absence below cannot pass vacuously: it proves
        // MUI's indicator buttons ARE reachable by role and name here.
        expect(screen.getAllByRole('button', { name: 'Open' }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();

        await fillMandatoryFields();

        expect(await submit(user)).toMatchObject({ salutation: 'not_specified' });
    });
});

describe('counsellor avatar (#1046)', () => {
    it('submits the chosen motif as the ICON kind plus its id', async () => {
        const user = userEvent.setup();
        renderForm();
        await fillMandatoryFields();

        // t is mocked to a single label per key, so every motif tile shares one
        // accessible name here — the first is a real, arbitrary motif.
        await user.click(screen.getAllByRole('radio', { name: 'Symbol' })[0]);

        const submitted = await submit(user);
        expect(submitted.avatarKind).toBe('ICON');
        expect(submitted.avatarId).toEqual(expect.any(String));
        expect(submitted.avatarId).not.toBe('');
    });

    it('submits INITIALS without a motif id', async () => {
        const user = userEvent.setup();
        renderForm();
        await fillMandatoryFields();

        await user.click(screen.getByRole('radio', { name: 'Initialen' }));

        expect(await submit(user)).toMatchObject({ avatarKind: 'INITIALS', avatarId: '' });
    });

    it('shows the stored choice again when the consultant is reopened', async () => {
        mocks.params = { id: 'consultant-1', typeOfUsers: 'consultants' };
        mocks.counselorResult = {
            data: { id: 'consultant-1', avatarKind: 'ICON', avatarId: 'fox' },
            isLoading: false,
        };
        renderForm();

        const selected = await screen.findByRole('radio', { name: 'Symbol', checked: true });
        expect(selected).toBeInTheDocument();
    });

    it('leaves a consultant who never chose without a selection, and writes nothing', async () => {
        const user = userEvent.setup();
        renderForm();
        await fillMandatoryFields();

        expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument();

        // The field is registered, so the key exists — it must carry no choice.
        const submitted = await submit(user);
        expect(submitted.avatarKind).toBeUndefined();
    });
});

describe('public and internal display names (#996)', () => {
    it('submits both names independently', async () => {
        const user = userEvent.setup();
        renderForm();

        setField('Öffentlicher Anzeigename', 'Ada L.');
        setField('Interner Anzeigename', 'Ada Lovelace (Team Nord)');
        await fillMandatoryFields();

        expect(await submit(user)).toMatchObject({
            displayName: 'Ada L.',
            internalDisplayName: 'Ada Lovelace (Team Nord)',
        });
    });
});

describe('assignment fields', () => {
    it('renders tenant, agency and topic assignment exactly once each', async () => {
        // Regression guard: the consultant-topics work once rendered a second
        // copy of the tenant and agency selects.
        mocks.agenciesResult = {
            data: {
                data: [
                    {
                        id: 3,
                        name: 'Beratungsstelle Nord',
                        postcode: '20095',
                        city: 'Hamburg',
                        tenantId: TENANT.id,
                        topics: [],
                    },
                ],
            },
            isLoading: false,
        };
        mocks.topicsResult = { data: [{ id: 11, name: 'Sucht' }], isLoading: false };
        const user = userEvent.setup();
        renderForm();

        expect(screen.getAllByLabelText('Trägerzuordnung *')).toHaveLength(1);
        expect(screen.getAllByLabelText('Beratungsstelle')).toHaveLength(1);
        // Topics only appear once an agency is assigned.
        expect(screen.queryByLabelText('Themen')).not.toBeInTheDocument();

        await waitFor(() => expect(mocks.getSingleTenantData).toHaveBeenCalledWith(TENANT.id));
        await chooseOption(user, 'Beratungsstelle', '20095 Beratungsstelle Nord Hamburg');

        expect(await screen.findAllByLabelText('Themen bei Beratungsstelle Nord (20095 Hamburg)')).toHaveLength(1);
    });
});

describe('topics per centre (#1264)', () => {
    const SUCHT = { id: 11, name: 'Sucht' };
    const SCHULDEN = { id: 12, name: 'Schulden' };
    const FAMILIE = { id: 13, name: 'Familie' };
    const NORD = {
        id: 1,
        name: 'Nord',
        postcode: '20095',
        city: 'Hamburg',
        tenantId: TENANT.id,
        topics: [SUCHT, SCHULDEN],
    };
    const SUED = {
        id: 2,
        name: 'Süd',
        postcode: '80331',
        city: 'München',
        tenantId: TENANT.id,
        topics: [SUCHT, FAMILIE],
    };
    const OST = { id: 3, name: 'Ost', postcode: '10115', city: 'Berlin', tenantId: TENANT.id, topics: [FAMILIE] };
    const WEST = { id: 4, name: 'West', postcode: '50667', city: 'Köln', tenantId: TENANT.id, topics: [SCHULDEN] };
    const ID = 'consultant-7';

    const editConsultant = (agencies: any[], stored: Record<string, unknown>) => {
        const edited = {
            id: ID,
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada@example.org',
            username: 'ada',
            tenantId: TENANT.id,
            agencies,
            isSupervisor: false,
        };
        mocks.params = { id: ID, typeOfUsers: 'consultants' };
        mocks.consultantsResult = { data: { data: [edited] }, isLoading: false };
        mocks.counselorResult = { data: { ...edited, ...stored }, isLoading: false };
        mocks.agenciesResult = { data: { data: [NORD, SUED, OST, WEST] }, isLoading: false };
        mocks.topicsResult = { data: [SUCHT, SCHULDEN, FAMILIE], isLoading: false };
    };

    const optionsOf = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
        await user.click(screen.getByLabelText(label));
        const names = (await screen.findAllByRole('option')).map((option) => option.textContent);
        await user.keyboard('{Escape}');
        return names;
    };

    const unlock = (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    const removeChip = async (user: ReturnType<typeof userEvent.setup>, chipLabel: string) => {
        const chip = screen.getByRole('button', { name: chipLabel });
        await user.click(chip.querySelector('.MuiChip-deleteIcon') as Element);
    };

    it("shows one picker per centre, offering only that centre's topics", async () => {
        editConsultant([NORD, SUED], {
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
        });
        const user = userEvent.setup();
        renderForm();
        await unlock(user);

        expect(await optionsOf(user, 'Themen bei Nord (20095 Hamburg)')).toEqual(['Schulden', 'Sucht']);
        expect(await optionsOf(user, 'Themen bei Süd (80331 München)')).toEqual(['Familie', 'Sucht']);
        expect(screen.queryByLabelText('Themen')).not.toBeInTheDocument();
    });

    it('saves the topics per centre, plus their union as flat topicIds', async () => {
        editConsultant([NORD, SUED], {
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
        });
        const user = userEvent.setup();
        renderForm();
        await unlock(user);

        expect(await submit(user)).toMatchObject({
            topicIds: ['11', '13'],
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
        });
    });

    it('pre-fills a legacy topic at every centre that offers it', async () => {
        editConsultant([NORD, SUED], { topicsByAgency: [{ topicIds: [11] }] });
        const user = userEvent.setup();
        renderForm();
        await unlock(user);

        expect((await submit(user)).topicsByAgency).toEqual([
            { agencyId: 1, topicIds: [11] },
            { agencyId: 2, topicIds: [11] },
        ]);
    });

    it('sends only flat topicIds to a server that does not know topicsByAgency', async () => {
        editConsultant([NORD], { topics: [SUCHT] });
        const user = userEvent.setup();
        renderForm();
        await unlock(user);

        const payload = await submit(user);
        expect(payload.topicIds).toEqual(['11']);
        expect(payload).not.toHaveProperty('topicsByAgency');
    });

    it('adds a picker for an added centre, preselecting its only topic', async () => {
        editConsultant([NORD], { topicsByAgency: [{ agencyId: 1, topicIds: [11] }] });
        const user = userEvent.setup();
        renderForm();
        await unlock(user);
        await chooseOption(user, 'Beratungsstelle', '50667 West Köln');

        expect(await screen.findByLabelText('Themen bei West (50667 Köln)')).toBeInTheDocument();
        expect((await submit(user)).topicsByAgency).toEqual([
            { agencyId: 1, topicIds: [11] },
            { agencyId: 4, topicIds: [12] },
        ]);
    });

    it('keeps the stored topics when the detail record arrives before the search result', async () => {
        // A cached get-by-id (second visit) resolves before the search: the centres are unknown then,
        // and locking the pickers to "no centres" would save an empty topic list.
        editConsultant([NORD, SUED], {
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
        });
        const loaded = mocks.consultantsResult;
        mocks.consultantsResult = { data: undefined, isLoading: true } as any;
        const user = userEvent.setup();
        const { rerender } = renderForm();

        mocks.consultantsResult = loaded;
        rerender(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <UserEditOrAdd />
            </QueryClientProvider>,
        );
        await unlock(user);

        expect(await screen.findByRole('button', { name: 'Sucht' })).toBeInTheDocument();
        expect(await submit(user)).toMatchObject({
            topicIds: ['11', '13'],
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
        });
    });

    it('keeps the stored topics of a centre that is missing from the centre list', async () => {
        editConsultant([NORD, SUED], {
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
            topics: [SUCHT, FAMILIE],
        });
        // Süd is assigned but not in the list (other tenant, deleted, beyond the page).
        mocks.agenciesResult = { data: { data: [NORD, OST, WEST] }, isLoading: false };
        const user = userEvent.setup();
        renderForm();
        await unlock(user);

        // null = "keep what is stored"; a flat list would be redistributed, or rejected.
        const payload = await submit(user);
        expect(payload.topicIds).toBeNull();
        expect(payload).not.toHaveProperty('topicsByAgency');
    });

    describe('a stored topic the centre no longer offers', () => {
        const editWithDroppedTopic = async (user: ReturnType<typeof userEvent.setup>) => {
            // Nord offers Sucht and Schulden; Familie was stored there before Nord dropped it.
            editConsultant([NORD], {
                topicsByAgency: [{ agencyId: 1, topicIds: [11, 13] }],
                topics: [SUCHT, FAMILIE],
            });
            renderForm();
            await unlock(user);
        };

        it('shows it as a marked chip with a notice, and keeps it on an unrelated save', async () => {
            const user = userEvent.setup();
            await editWithDroppedTopic(user);

            expect(
                screen.getByRole('button', { name: 'Familie – wird hier nicht mehr angeboten' }),
            ).toBeInTheDocument();
            expect(screen.getByText('Markierte Themen bietet diese Stelle nicht mehr an.')).toBeInTheDocument();
            const payload = await submit(user);
            expect(payload.topicIds).toBeNull();
            expect(payload).not.toHaveProperty('topicsByAgency');
        });

        it('saves without it once the admin removed it', async () => {
            const user = userEvent.setup();
            await editWithDroppedTopic(user);
            await removeChip(user, 'Familie – wird hier nicht mehr angeboten');

            expect(await submit(user)).toMatchObject({
                topicIds: ['11'],
                topicsByAgency: [{ agencyId: 1, topicIds: [11] }],
            });
        });

        it('asks to remove it before other topic changes are saved', async () => {
            const user = userEvent.setup();
            await editWithDroppedTopic(user);
            await chooseOption(user, 'Themen bei Nord (20095 Hamburg)', 'Schulden');
            await user.keyboard('{Escape}');
            await user.click(screen.getByRole('button', { name: 'Speichern' }));

            expect(await screen.findByText('Erst markierte Themen entfernen.')).toBeInTheDocument();
            expect(mocks.mutate).not.toHaveBeenCalled();
        });
    });

    describe('moving a counsellor to a centre that lacks a topic (Admin#1034)', () => {
        const moveNordToOst = async (user: ReturnType<typeof userEvent.setup>) => {
            editConsultant([NORD], { topicsByAgency: [{ agencyId: 1, topicIds: [12] }] });
            renderForm();
            await unlock(user);
            await chooseOption(user, 'Beratungsstelle', '10115 Ost Berlin');
            await user.keyboard('{Escape}');
            await removeChip(user, '20095 Nord Hamburg');
            expect(screen.queryByLabelText('Themen bei Nord (20095 Hamburg)')).not.toBeInTheDocument();
            await user.click(screen.getByRole('button', { name: 'Speichern' }));
            return screen.findByRole('dialog');
        };

        it('asks before saving and names the uncovered topic', async () => {
            const user = userEvent.setup();
            const dialog = await moveNordToOst(user);

            expect(dialog).toHaveTextContent('Themen passen nicht zur neuen Beratungsstelle');
            expect(dialog).toHaveTextContent('Schulden');
            expect(mocks.mutate).not.toHaveBeenCalled();
        });

        it('"Thema weglassen" saves without the topic', async () => {
            const user = userEvent.setup();
            await moveNordToOst(user);
            await user.click(screen.getByRole('button', { name: 'Thema weglassen' }));

            await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
            // Ost's only topic is preselected when the centre is added.
            expect(mocks.mutate.mock.calls[0][0].topicsByAgency).toEqual([{ agencyId: 3, topicIds: [13] }]);
            expect(mocks.addTopicsToAgency).not.toHaveBeenCalled();
        });

        it('"Thema bei Ost ergänzen" adds it to the centre, then saves it there', async () => {
            const user = userEvent.setup();
            await moveNordToOst(user);
            await user.click(screen.getByRole('button', { name: 'Thema bei Ost (10115 Berlin) ergänzen' }));

            await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
            expect(mocks.addTopicsToAgency).toHaveBeenCalledWith('3', ['12']);
            expect(mocks.mutate.mock.calls[0][0].topicsByAgency).toEqual([{ agencyId: 3, topicIds: [13, 12] }]);
        });

        it('disables adding the topic, with the reason, without the right to edit that centre', async () => {
            mocks.canUpdateAgency = false;
            const user = userEvent.setup();
            const dialog = await moveNordToOst(user);

            expect(screen.getByRole('button', { name: 'Thema bei Ost (10115 Berlin) ergänzen' })).toBeDisabled();
            expect(dialog).toHaveTextContent('Keine Berechtigung für Ost (10115 Berlin).');
        });

        it('says the topic becomes publicly offered at the new centre', async () => {
            const user = userEvent.setup();
            const dialog = await moveNordToOst(user);

            expect(dialog).toHaveTextContent('Wird danach bei Ost (10115 Berlin) öffentlich angeboten.');
        });

        it('disables adding the topic, with the reason, when a centre may hold only one topic', async () => {
            mocks.appSettings = { oneTopicPerAgencyEnabled: true };
            const user = userEvent.setup();
            const dialog = await moveNordToOst(user);

            expect(screen.getByRole('button', { name: 'Thema bei Ost (10115 Berlin) ergänzen' })).toBeDisabled();
            expect(dialog).toHaveTextContent(
                'Nur ein Thema (Fachbereich) pro Stelle: Ost (10115 Berlin) hat schon eins.',
            );
        });

        it('explains a refused right to edit the centre and does not save', async () => {
            const { ADD_TOPICS_ERRORS } = await import('../../../api/agency/addTopicsToAgency');
            mocks.addTopicsToAgency.mockRejectedValue(new Error(ADD_TOPICS_ERRORS.FORBIDDEN));
            const toast = vi.spyOn(message, 'error');
            const user = userEvent.setup();
            await moveNordToOst(user);
            await user.click(screen.getByRole('button', { name: 'Thema bei Ost (10115 Berlin) ergänzen' }));

            await waitFor(() =>
                expect(toast).toHaveBeenCalledWith(
                    expect.objectContaining({ content: 'Keine Berechtigung, Ost (10115 Berlin) zu ändern.' }),
                ),
            );
            expect(mocks.mutate).not.toHaveBeenCalled();
        });

        it('asks to try again when the one-topic switch cannot be read', async () => {
            const { ADD_TOPICS_ERRORS } = await import('../../../api/agency/addTopicsToAgency');
            mocks.addTopicsToAgency.mockRejectedValue(new Error(ADD_TOPICS_ERRORS.SETTINGS_UNAVAILABLE));
            const toast = vi.spyOn(message, 'error');
            const user = userEvent.setup();
            await moveNordToOst(user);
            await user.click(screen.getByRole('button', { name: 'Thema bei Ost (10115 Berlin) ergänzen' }));

            await waitFor(() =>
                expect(toast).toHaveBeenCalledWith(
                    expect.objectContaining({ content: 'Gerade nicht prüfbar, bitte erneut versuchen.' }),
                ),
            );
            expect(mocks.mutate).not.toHaveBeenCalled();
        });

        it('cannot be closed while the topic is being added', async () => {
            mocks.addTopicsToAgency.mockReturnValue(new Promise(() => {}));
            const user = userEvent.setup();
            await moveNordToOst(user);
            await user.click(screen.getByRole('button', { name: 'Thema bei Ost (10115 Berlin) ergänzen' }));
            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape', keyCode: 27 });

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Thema weglassen' })).toBeDisabled();
        });

        it('"Neue Beratungsstelle anlegen" opens the agency create page without saving', async () => {
            const user = userEvent.setup();
            await moveNordToOst(user);
            await user.click(screen.getByRole('button', { name: 'Neue Beratungsstelle anlegen' }));

            expect(mocks.navigate).toHaveBeenCalledWith('/admin/agency/add');
            expect(mocks.mutate).not.toHaveBeenCalled();
        });
    });
});

describe('standing supervisor (ADR-008 "Supervision (auto-assigned)")', () => {
    const CONSULTANT_ID = 'consultant-1';
    const SUPERVISOR_ID = 'supervisor-9';

    const editExistingConsultant = (counselorData: any) => {
        mocks.params = { id: CONSULTANT_ID, typeOfUsers: 'consultants' };
        const edited = {
            id: CONSULTANT_ID,
            firstname: 'Ada',
            lastname: 'Lovelace',
            email: 'ada.lovelace@example.org',
            username: 'ada-lovelace',
            tenantId: TENANT.id,
            agencies: [],
            // Ada may BE a supervisor for others — that must still not let her supervise herself.
            isSupervisor: true,
            // The list endpoint never fills this — see the comment in index.tsx.
            assignedSupervisorId: null,
        };
        mocks.consultantsResult = { data: { data: [edited] }, isLoading: false };
        mocks.supervisorCandidatesResult = {
            data: {
                data: [
                    edited,
                    {
                        id: SUPERVISOR_ID,
                        firstname: 'Grace',
                        lastname: 'Hopper',
                        isSupervisor: true,
                        tenantId: TENANT.id,
                        agencies: [],
                    },
                    {
                        id: 'colleague-plain',
                        firstname: 'Plain',
                        lastname: 'Colleague',
                        isSupervisor: false,
                        tenantId: TENANT.id,
                        agencies: [],
                    },
                    {
                        id: 'supervisor-disabled',
                        firstname: 'Disabled',
                        lastname: 'Supervisor',
                        isSupervisor: true,
                        active: false,
                        tenantId: TENANT.id,
                        agencies: [],
                    },
                    {
                        id: 'supervisor-absent-disabled',
                        firstname: 'AbsentDisabled',
                        lastname: 'Supervisor',
                        isSupervisor: true,
                        // Absent AND disabled: resolveDisplayStatus reports ABSENT and never looks
                        // at `active`, which is exactly how this one used to slip through.
                        absent: true,
                        active: false,
                        tenantId: TENANT.id,
                        agencies: [],
                    },
                    {
                        id: 'supervisor-absent-only',
                        firstname: 'AbsentOnly',
                        lastname: 'Supervisor',
                        isSupervisor: true,
                        // Absence alone is temporary; ADR-008 lets supervision lapse rather than
                        // block, so this one must stay assignable.
                        absent: true,
                        active: true,
                        tenantId: TENANT.id,
                        agencies: [],
                    },
                    {
                        id: 'supervisor-deleting',
                        firstname: 'Deleting',
                        lastname: 'Supervisor',
                        isSupervisor: true,
                        status: 'IN_DELETION',
                        tenantId: TENANT.id,
                        agencies: [],
                    },
                    {
                        id: 'supervisor-foreign',
                        firstname: 'Foreign',
                        lastname: 'Supervisor',
                        isSupervisor: true,
                        tenantId: TENANT.id + 1,
                        agencies: [],
                    },
                ],
            },
            isLoading: false,
            isError: false,
        };
        mocks.counselorResult = { data: counselorData, isLoading: false };
    };

    const unlockAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        return submit(user);
    };

    /**
     * The dangerous case. Only `GET /useradmin/consultants/{id}` carries the stored assignment;
     * when it fails the form still renders. Sending `assignedSupervisorId: ''` then would clear a
     * standing supervisor the admin never touched, on any unrelated edit.
     */
    it('never writes the field when the stored assignment could not be read', async () => {
        const user = userEvent.setup();
        editExistingConsultant(undefined);
        renderForm();

        expect(await unlockAndSubmit(user)).not.toHaveProperty('assignedSupervisorId');
    });

    it('clears the assignment when the admin empties the field', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: SUPERVISOR_ID });
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        // Hover is what a real admin does to reveal the clear affordance.
        await user.hover(screen.getByLabelText('Fester Supervisor'));
        // Query it by its visible title rather than MUI's internal class, so a class rename in
        // the library cannot silently turn this assertion into a no-op. `getByRole` is not usable
        // here: MUI keeps the button mounted at `visibility: hidden` and reveals it through a CSS
        // `:hover` rule that jsdom never applies, and dom-accessibility-api computes no accessible
        // name for a visibility-hidden element — so role+name finds nothing even with
        // `hidden: true`. `fireEvent` for the same reason: user-event refuses to click an element
        // it considers invisible.
        fireEvent.click(screen.getByTitle('Clear'));

        // '' is the backend's "clear it" signal; undefined would leave the supervisor in place.
        expect(await submit(user)).toMatchObject({ assignedSupervisorId: '' });
    });

    /**
     * The field is written only on a deliberate change. Anything else risks submitting a value we
     * did not actually know — a stale detail cache is enough — and '' means "clear it" to the
     * backend, so an unrelated edit could drop a supervisor nobody touched.
     */
    it('leaves the stored assignment alone when the admin does not touch the field', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: SUPERVISOR_ID });
        renderForm();

        expect(await unlockAndSubmit(user)).not.toHaveProperty('assignedSupervisorId');
    });

    /**
     * Three predicates, one list: the colleague must hold the supervisor capability, must not be
     * the consultant being edited, and must sit in the same tenant. A platform admin's search
     * spans tenants, and a foreign assignment is stored but never honoured at accept time — it
     * would look configured and supervise nothing.
     */
    it("offers only eligible supervisors from the edited consultant's own tenant", async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, tenantId: TENANT.id, assignedSupervisorId: undefined });
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        await user.click(screen.getByLabelText('Fester Supervisor'));

        expect(await screen.findByRole('option', { name: 'Grace Hopper' })).toBeTruthy();
        // Ada herself, even though she holds the capability.
        expect(screen.queryByRole('option', { name: 'Ada Lovelace' })).toBeNull();
        // A colleague without the capability.
        expect(screen.queryByRole('option', { name: 'Plain Colleague' })).toBeNull();
        // A supervisor in another tenant.
        expect(screen.queryByRole('option', { name: 'Foreign Supervisor' })).toBeNull();
        // Accounts that cannot work: they keep the capability flag but would supervise nothing.
        expect(screen.queryByRole('option', { name: 'Disabled Supervisor' })).toBeNull();
        expect(screen.queryByRole('option', { name: 'Deleting Supervisor' })).toBeNull();
        expect(screen.queryByRole('option', { name: 'AbsentDisabled Supervisor' })).toBeNull();
        // Absence on its own is not a reason to exclude anybody.
        expect(screen.queryByRole('option', { name: 'AbsentOnly Supervisor' })).toBeTruthy();
    });

    /**
     * An outage must not read as "nobody is eligible". The candidate search swallows failures into
     * an empty list unless the query opts into rethrowing, so without this the admin would be told
     * there is nobody to pick while the API was down — and could not tell the difference.
     */
    it('says the list could not be loaded, and locks the field, when the candidate query fails', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: undefined });
        mocks.supervisorCandidatesResult = { data: undefined, isLoading: false, isError: true };
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

        expect(screen.getByText('Liste konnte nicht geladen werden.')).toBeTruthy();
        expect(screen.getByLabelText('Fester Supervisor')).toHaveProperty('disabled', true);
    });

    it('locks the field and says so when the stored assignment could not be read', async () => {
        const user = userEvent.setup();
        editExistingConsultant(undefined);
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

        expect(screen.getByText('Gespeicherte Zuweisung nicht ladbar.')).toBeTruthy();
        expect(screen.getByLabelText('Fester Supervisor')).toHaveProperty('disabled', true);
    });

    /**
     * The candidate query reads one page. Beyond it, eligible supervisors exist that the admin
     * cannot select — so the short list must not be presented as if it were complete.
     */
    it('warns when there are more consultants than the candidate query reads', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: undefined });
        mocks.supervisorCandidatesResult = {
            ...mocks.supervisorCandidatesResult,
            data: { ...mocks.supervisorCandidatesResult.data, total: 1001 },
        };
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

        expect(screen.getByText('Nur die ersten 1000 werden durchsucht.')).toBeTruthy();
    });

    /**
     * antd applies `initialValues` once, at mount, and the detail query is invalidated on every
     * save — so without an explicit sync the selector keeps showing what the form mounted with
     * while the backend already holds something else.
     */
    it('picks up the stored assignment when the detail record arrives after mount', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: undefined });
        const { rerender } = renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        await waitFor(() => expect(screen.getByLabelText('Fester Supervisor')).toHaveProperty('value', ''));

        mocks.counselorResult = {
            data: { id: CONSULTANT_ID, assignedSupervisorId: SUPERVISOR_ID },
            isLoading: false,
        };
        rerender(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <UserEditOrAdd />
            </QueryClientProvider>,
        );

        await waitFor(() => expect(screen.getByLabelText('Fester Supervisor')).toHaveProperty('value', 'Grace Hopper'));

        // The sync must not count as an admin edit. If `setFieldsValue` marked the field touched,
        // this unrelated save would start writing a value nobody chose — the same data-loss shape
        // the touched-field guard exists to prevent.
        expect(await submit(user)).not.toHaveProperty('assignedSupervisorId');
    });

    /**
     * The other half of the sync: a background refetch must never overwrite what the admin just
     * picked. Otherwise their selection silently reverts to whatever the server last said, and
     * they save a value they did not choose.
     */
    it("keeps the admin's pick when a detail refetch brings a different value", async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: undefined });
        const { rerender } = renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        await chooseOption(user, 'Fester Supervisor', 'Grace Hopper');

        // A refetch lands, saying somebody else is stored.
        mocks.counselorResult = {
            data: { id: CONSULTANT_ID, assignedSupervisorId: 'supervisor-other' },
            isLoading: false,
        };
        rerender(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <UserEditOrAdd />
            </QueryClientProvider>,
        );

        expect(screen.getByLabelText('Fester Supervisor')).toHaveProperty('value', 'Grace Hopper');
    });

    /**
     * A stored supervisor who has since been disabled must stay VISIBLE — the admin has to see the
     * stale assignment to correct it — but must not be selectable again, or they could switch away
     * and pick it straight back, storing an assignment that supervises nothing.
     */
    it('shows a stale stored supervisor but does not let it be picked again', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: 'supervisor-disabled' });
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        await user.click(screen.getByLabelText('Fester Supervisor'));

        const staleOption = await screen.findByRole('option', { name: 'Disabled Supervisor' });
        expect(staleOption.getAttribute('aria-disabled')).toBe('true');
    });

    /**
     * Both conditions at once. The locked field is what stops the admin working, so that has to be
     * what the field says — a truncation note would send them looking in the wrong place.
     */
    it('explains the locked field rather than the capped search when both apply', async () => {
        const user = userEvent.setup();
        editExistingConsultant(undefined);
        mocks.supervisorCandidatesResult = {
            ...mocks.supervisorCandidatesResult,
            data: { ...mocks.supervisorCandidatesResult.data, total: 1001 },
        };
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));

        expect(screen.getByText('Gespeicherte Zuweisung nicht ladbar.')).toBeTruthy();
        expect(screen.queryByText('Nur die ersten 1000 werden durchsucht.')).toBeNull();
    });

    it('writes the new supervisor when the admin picks one', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: undefined });
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        await chooseOption(user, 'Fester Supervisor', 'Grace Hopper');

        expect(await submit(user)).toMatchObject({ assignedSupervisorId: SUPERVISOR_ID });
    });
});

// antd resolves only REGISTERED fields in `onFinish`. This form shows the absence note but
// not the toggle, so `absent` has to be registered and hidden or it arrives as `undefined`.
describe('absence survives an unrelated edit', () => {
    const ABSENCE_NOTE = 'Bin bis zum 30.09. nicht erreichbar.';
    const absentConsultant = {
        id: 'consultant-absent',
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada.lovelace@example.org',
        username: 'ada-lovelace',
        tenantId: TENANT.id,
        agencies: [],
        absent: true,
        absenceMessage: ABSENCE_NOTE,
    };

    const openAbsentConsultant = () => {
        mocks.params = { id: absentConsultant.id, typeOfUsers: 'consultants' };
        mocks.consultantsResult = { data: { data: [absentConsultant] }, isLoading: false };
        mocks.counselorResult = { data: absentConsultant, isLoading: false };
    };

    it('submits the stored absence when the admin only changed the e-mail', async () => {
        const user = userEvent.setup();
        openAbsentConsultant();
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        // The reason the admin opened the page at all: something unrelated.
        setField('E-Mail', 'ada.neu@example.org');

        const payload = await submit(user);

        expect(payload.email).toBe('ada.neu@example.org');
        expect(payload.absent).toBe(true);
        expect(payload.absenceMessage).toBe(ABSENCE_NOTE);
    });

    it('shows the stored note, and submits what was typed into it', async () => {
        // The note is rendered on this screen even though the toggle is not, so it has to be
        // a field that actually saves — not a box that quietly discards what is typed.
        const user = userEvent.setup();
        openAbsentConsultant();
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        expect(screen.getByLabelText('Abwesenheitsnotiz')).toHaveValue(ABSENCE_NOTE);

        setField('Abwesenheitsnotiz', 'Zurueck ab dem 01.10.');

        const payload = await submit(user);
        expect(payload.absent).toBe(true);
        expect(payload.absenceMessage).toBe('Zurueck ab dem 01.10.');
    });

    it('leaves a present counsellor present, with no note on screen', async () => {
        const user = userEvent.setup();
        const present = { ...absentConsultant, id: 'consultant-present', absent: false, absenceMessage: undefined };
        mocks.params = { id: present.id, typeOfUsers: 'consultants' };
        mocks.consultantsResult = { data: { data: [present] }, isLoading: false };
        mocks.counselorResult = { data: present, isLoading: false };
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        expect(screen.queryByLabelText('Abwesenheitsnotiz')).not.toBeInTheDocument();

        expect(await submit(user)).toMatchObject({ absent: false });
    });
});

describe('existing consultant username validation', () => {
    it('saves added agency membership without revalidating or changing an immutable email-style username', async () => {
        const topic = { id: 2, name: 'Kinder und Jugendliche' };
        const originalAgency = {
            id: 12,
            name: 'Original agency',
            postcode: '10115',
            city: 'Berlin',
            tenantId: TENANT.id,
            topics: [topic],
        };
        const addedAgency = { ...originalAgency, id: 14, name: 'Isolated test agency' };
        const existing = {
            id: 'bart',
            firstname: 'Bart',
            lastname: 'Simpson',
            email: 'bart.simpson@example.org',
            username: 'bart.simpson@example.org',
            tenantId: TENANT.id,
            agencies: [originalAgency],
            isSupervisor: false,
        };
        mocks.params = { id: existing.id, typeOfUsers: 'consultants' };
        mocks.consultantsResult = { data: { data: [existing] }, isLoading: false };
        mocks.counselorResult = { data: { ...existing, topics: [topic] }, isLoading: false };
        mocks.agenciesResult = { data: { data: [originalAgency, addedAgency] }, isLoading: false };
        mocks.topicsResult = { data: [topic], isLoading: false };
        const user = userEvent.setup();
        renderForm();
        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        expect(screen.getByLabelText('Benutzername')).toBeDisabled();
        expect(screen.getByLabelText('Benutzername')).toHaveValue(existing.username);
        await chooseOption(user, 'Beratungsstelle', '10115 Isolated test agency Berlin');
        const payload = await submit(user);
        expect(payload.username).toBe(existing.username);
        expect(payload.agencies.map(({ value }: { value: number }) => Number(value)).sort()).toEqual([12, 14]);
        expect(payload).toMatchObject({
            firstname: existing.firstname,
            lastname: existing.lastname,
            email: existing.email,
            isSupervisor: false,
        });
        expect(screen.getByLabelText('Benutzername')).toBeDisabled();
    });
});
