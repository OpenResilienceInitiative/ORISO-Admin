import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserEditOrAdd } from './index';
import { UserRole } from '../../../enums/UserRole';

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
}));

const TENANT = { id: 7, name: 'Caritas Augsburg' };

const translations: Record<string, string> = {
    firstname: 'Vorname',
    lastname: 'Nachname',
    email: 'E-Mail',
    'counselor.username': 'Benutzername',
    'counselor.password': 'Passwort',
    'counselor.passwordConfirmation': 'Passwort wiederholen',
    'counselor.displayName': 'Öffentlicher Anzeigename',
    'counselor.internalDisplayName': 'Interner Anzeigename',
    'counselor.salutation': 'Anrede',
    'counselor.salutation.option.counsellor_female': 'Beraterin',
    'counselor.salutation.option.counsellor_male': 'Berater',
    'counselor.salutation.option.counselling_person': 'Beratende Person',
    'counselor.salutation.option.counsellor_gender_neutral': 'Berater*in',
    'counselor.salutation.option.not_specified': 'Keine Angabe',
    'counselor.position': 'Funktion',
    'counselor.personalTitle': 'Titel',
    'counselor.adminRemarks': 'Interne Anmerkungen',
    'counselor.assignedSupervisor': 'Fester Supervisor',
    'counselor.assignedSupervisor.loadFailed': 'Liste konnte nicht geladen werden.',
    'counselor.assignedSupervisor.detailsUnavailable': 'Gespeicherte Zuweisung nicht ladbar.',
    'counselor.assignedSupervisor.noCandidates': 'Noch niemand freigegeben.',
    'counselor.assignedSupervisor.truncated': 'Nur die ersten 1000 werden durchsucht.',
    'tenantAdmins.form.tenantAssignment': 'Trägerzuordnung',
    agency: 'Beratungsstelle',
    'topics.title': 'Themen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    'btn.cancel': 'Abbrechen',
};

const t = (key: string) => translations[key] ?? key;

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
    useUserPermissions: () => ({ permissions: {}, can: () => true }),
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
    setField('Passwort wiederholen', 'Str0ng!Pass');
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

        expect(await screen.findAllByLabelText('Themen')).toHaveLength(1);
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

    it('writes the new supervisor when the admin picks one', async () => {
        const user = userEvent.setup();
        editExistingConsultant({ id: CONSULTANT_ID, assignedSupervisorId: undefined });
        renderForm();

        await user.click(screen.getByRole('button', { name: 'Bearbeiten' }));
        await chooseOption(user, 'Fester Supervisor', 'Grace Hopper');

        expect(await submit(user)).toMatchObject({ assignedSupervisorId: SUPERVISOR_ID });
    });
});
