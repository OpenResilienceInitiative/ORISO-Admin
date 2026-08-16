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
    counselorResult: { data: undefined as any, isLoading: false },
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
        // The consultant *create* form: no `id`, so nothing is read-only and the
        // save button is available without first unlocking the form.
        useParams: () => ({ id: 'add', typeOfUsers: 'consultants' }),
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
    useConsultantsOrAdminsData: () => mocks.consultantsResult,
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
    mocks.counselorResult = { data: undefined, isLoading: false };
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

    it('omits the remarks field for a restricted agency admin, whose submission carries no remarks', async () => {
        // The backend refuses to read or write remarks for this role, so the
        // field must be absent — not merely disabled.
        mocks.roles = [UserRole.RestrictedAgencyAdmin];
        const user = userEvent.setup();
        renderForm();

        expect(screen.queryByLabelText('Interne Anmerkungen')).not.toBeInTheDocument();

        await fillMandatoryFields();

        expect(await submit(user)).not.toHaveProperty('adminRemarks');
    });

    it('omits the remarks field for a plain agency admin', async () => {
        mocks.roles = [UserRole.AgencyAdmin];
        renderForm();

        expect(screen.queryByLabelText('Interne Anmerkungen')).not.toBeInTheDocument();
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
        // checked with the control populated.
        expect(
            (salutation.closest('.MuiAutocomplete-root') as HTMLElement).querySelector(
                '.MuiAutocomplete-clearIndicator',
            ),
        ).toBeNull();

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
