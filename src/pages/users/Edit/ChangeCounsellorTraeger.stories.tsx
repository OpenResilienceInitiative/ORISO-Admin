import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { Navigate, Route, Routes } from 'react-router-dom';
import i18n from 'i18next';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { UserEditOrAdd } from '.';

/**
 * Admin#1216: a platform admin changes the Träger of a counsellor. The dialog says that open cases
 * stay with the old Träger; a refusal keeps the edit. Träger admins see the field read-only.
 */

const OLD_TENANT = { id: 7, name: 'Caritas Augsburg' };
const NEW_TENANT = { id: 12, name: 'Diakonie Nord' };
const CONSULTANT_ID = 'consultant-7';

const SUCHT = { id: 11, name: 'Sucht', status: 'ACTIVE' };
const FAMILIE = { id: 13, name: 'Familie', status: 'ACTIVE' };

const centre = (id: number, name: string, postcode: string, city: string, tenantId: number, topics: object[]) => ({
    id,
    name,
    postcode,
    city,
    tenantId,
    consultingType: 1,
    teamAgency: false,
    offline: false,
    deleteDate: null,
    topics,
});
const NORD = centre(1, 'Beratungsstelle Nord', '20095', 'Hamburg', OLD_TENANT.id, [SUCHT]);
const SUED = centre(2, 'Beratungsstelle Süd', '80331', 'München', OLD_TENANT.id, [SUCHT]);
const MITTE = centre(21, 'Beratungsstelle Mitte', '30159', 'Hannover', NEW_TENANT.id, [SUCHT, FAMILIE]);
const KUESTE = centre(22, 'Beratungsstelle Küste', '24103', 'Kiel', NEW_TENANT.id, [FAMILIE]);
const CENTRES = [NORD, SUED, MITTE, KUESTE];

const tr = (key: string, values?: Record<string, unknown>) => String(i18n.t(key, values));

/** Requests the page sent, per story run; the play functions assert on them. */
let sent: { method: string; path: string; body: any }[] = [];
const record = async (request: Request) => {
    const text = await request.clone().text();
    sent.push({ method: request.method, path: new URL(request.url).pathname, body: text ? JSON.parse(text) : null });
};
const sentTo = (method: string, suffix: string) => sent.filter((r) => r.method === method && r.path.endsWith(suffix));

type MoveAnswer = () => Response | Promise<Response>;

const moved =
    (casesLeft: number): MoveAnswer =>
    () =>
        HttpResponse.json({
            consultantId: CONSULTANT_ID,
            previousTenantId: OLD_TENANT.id,
            tenantId: NEW_TENANT.id,
            agencyIds: [MITTE.id],
            casesLeftWithPreviousTenant: casesLeft,
            matrixAccessRevocationsQueued: casesLeft,
        });

const refusal =
    (status: number, text = '', headers: Record<string, string> = {}): MoveAnswer =>
    () =>
        new HttpResponse(text, { status, headers });

const handlers = (answer: MoveAnswer) => {
    const consultant = {
        id: CONSULTANT_ID,
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.org',
        username: 'ada',
        tenantId: OLD_TENANT.id,
        agencies: [NORD],
        isSupervisor: false,
        absent: false,
        formalLanguage: true,
    };
    return [
        http.get('*/service/tenantadmin/search', () =>
            HttpResponse.json({ total: 2, _embedded: [OLD_TENANT, NEW_TENANT] }),
        ),
        http.get('*/service/tenantadmin/:id', () => HttpResponse.json(OLD_TENANT)),
        http.get('*/service/topic/', () => HttpResponse.json([SUCHT, FAMILIE])),
        http.get('*/service/users/consultants/search', () =>
            HttpResponse.json({ _embedded: [{ _embedded: consultant }], total: 1 }),
        ),
        http.get('*/service/agencyadmin/agencies', () =>
            HttpResponse.json({ _embedded: CENTRES.map((c) => ({ _embedded: c })), total: CENTRES.length }),
        ),
        http.get('*/service/agencyadmin/agencies/:id', ({ params }) =>
            HttpResponse.json({ _embedded: CENTRES.find((c) => String(c.id) === params.id) }),
        ),
        http.get(`*/service/useradmin/consultants/${CONSULTANT_ID}`, () =>
            HttpResponse.json({ _embedded: { ...consultant, topicsByAgency: [{ agencyId: 1, topicIds: [11] }] } }),
        ),
        http.put(`*/service/useradmin/consultants/${CONSULTANT_ID}/tenant`, async ({ request }) => {
            await record(request);
            return answer();
        }),
        http.put(`*/service/useradmin/consultants/${CONSULTANT_ID}/agencies`, async ({ request }) => {
            await record(request);
            return new HttpResponse(null, { status: 200 });
        }),
        http.put(`*/service/useradmin/consultants/${CONSULTANT_ID}`, async ({ request }) => {
            await record(request);
            return HttpResponse.json({ _embedded: consultant });
        }),
    ];
};

const PLATFORM_ADMIN = [UserRole.AgencyAdmin, UserRole.TenantAdmin];

const meta = {
    title: 'Organisms/Pages/Users/CounsellorEdit/Change Träger',
    component: UserEditOrAdd,
    parameters: { layout: 'fullscreen', msw: { handlers: handlers(moved(3)) } },
    beforeEach: async () => {
        sent = [];
        const previousLanguage = i18n.language;
        await i18n.changeLanguage('de');
        return () => i18n.changeLanguage(previousLanguage);
    },
    decorators: [
        (Story, context) => {
            // The platform admin has tenant 0 in the token; a Träger admin carries their own.
            setStoryAuth(context.parameters.roles ?? PLATFORM_ADMIN, context.parameters.tokenTenantId ?? 0);
            return withAdminProviders(() => (
                <Routes>
                    <Route path="/" element={<Navigate to={`/admin/users/consultants/${CONSULTANT_ID}`} replace />} />
                    <Route path="/admin/users/:typeOfUsers/:id" element={<Story />} />
                    <Route path="/admin/users/:typeOfUsers" element={<p data-testid="list-page">Beratende</p>} />
                </Routes>
            ));
        },
    ],
} satisfies Meta<typeof UserEditOrAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The dialog's own wording, spelled out here so a missing translation cannot pass by echoing its key. */
const wording = (de: string, en: string) => (i18n.language.startsWith('en') ? en : de);

const phone = { globals: { viewport: { value: 'phone', isRotated: false } } };
const desktop = { globals: { viewport: { value: 'desktop', isRotated: false } } };
const english = async () => {
    const previousLanguage = i18n.language;
    await i18n.changeLanguage('en');
    return () => i18n.changeLanguage(previousLanguage);
};

const traegerField = () => screen.findByLabelText(`${tr('tenantAdmins.form.tenantAssignment')} *`);
const unlock = async () => userEvent.click(await screen.findByRole('button', { name: tr('edit') }));
const save = async () => userEvent.click(screen.getByRole('button', { name: tr('save') }));

const choose = async (label: string | HTMLElement, option: string) => {
    await userEvent.click(typeof label === 'string' ? screen.getByLabelText(label) : label);
    await userEvent.click(await screen.findByRole('option', { name: option }));
};

const optionsOf = async (label: string) => {
    await userEvent.click(screen.getByLabelText(label));
    const names = (await screen.findAllByRole('option')).map((option) => option.textContent);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    return names;
};

/** Unlocks the form, moves to Diakonie Nord and one of its centres, and presses Save. */
const reviewMove = async (centreName = '30159 Beratungsstelle Mitte Hannover') => {
    await unlock();
    await choose(await traegerField(), NEW_TENANT.name);
    await choose(tr('agency'), centreName);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await save();
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toBeVisible());
    return within(dialog);
};

const confirmMove = async (dialog: ReturnType<typeof within>) =>
    userEvent.click(dialog.getByRole('button', { name: wording('Träger wechseln', 'Change Träger') }));

/** The Träger field of a counsellor is greyed out until "Bearbeiten", then a platform admin can pick another. */
export const PlatformAdminCanChangeTraeger: Story = {
    play: async () => {
        await expect(await traegerField()).toBeDisabled();
        await unlock();
        await expect(await traegerField()).toBeEnabled();
        await choose(await traegerField(), NEW_TENANT.name);
        await expect(await traegerField()).toHaveValue(NEW_TENANT.name);
        await expect(screen.getByText(/nur Träger, Beratungsstellen und Themen gespeichert/)).toBeVisible();
    },
};

/** After choosing the new Träger only its centres are offered, and the old Träger's centre is dropped. */
export const OnlyCentresOfTheNewTraeger: Story = {
    play: async () => {
        await unlock();
        await expect(await optionsOf(tr('agency'))).toEqual([
            '20095 Beratungsstelle Nord Hamburg',
            '80331 Beratungsstelle Süd München',
        ]);
        await choose(await traegerField(), NEW_TENANT.name);
        await expect(await optionsOf(tr('agency'))).toEqual([
            '24103 Beratungsstelle Küste Kiel',
            '30159 Beratungsstelle Mitte Hannover',
        ]);
        await expect(screen.queryByRole('button', { name: '20095 Beratungsstelle Nord Hamburg' })).toBeNull();
    },
};

/** A Träger admin cannot change it, not even after "Bearbeiten". */
export const TraegerAdminSeesItReadOnly: Story = {
    parameters: { roles: [UserRole.TenantAdmin, UserRole.UserAdmin], tokenTenantId: OLD_TENANT.id },
    play: async () => {
        await unlock();
        await expect(await traegerField()).toBeDisabled();
        await expect(await traegerField()).toHaveValue(OLD_TENANT.name);
    },
};

/** A move without a centre of the new Träger is refused in the form, before anything is sent. */
export const NeedsACentreOfTheNewTraeger: Story = {
    play: async () => {
        await unlock();
        await choose(await traegerField(), NEW_TENANT.name);
        await save();
        await expect(
            await screen.findByText('Bitte mindestens eine Beratungsstelle des neuen Trägers wählen.'),
        ).toBeVisible();
        await expect(screen.queryByRole('dialog')).toBeNull();
        await expect(sent).toHaveLength(0);
    },
};

/** Save asks first. Nothing is sent before "Träger wechseln". */
export const AsksBeforeMoving: Story = {
    play: async () => {
        const dialog = await reviewMove();
        await expect(dialog.getByText(/Offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“/)).toBeVisible();
        await expect(dialog.getByText(/„Zuständigkeit beendet“ übernehmen/)).toBeVisible();
        await expect(dialog.getByText(/Beratungsstelle Mitte \(30159 Hannover\)/)).toBeVisible();
        await expect(sent).toHaveLength(0);
    },
};

/** The server counted 3 open cases: the dialog reports it. */
export const MovedWithOpenCases: Story = {
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await expect(
            await screen.findByText('3 offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“.'),
        ).toBeVisible();
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}/tenant`)[0].body).toEqual({
            tenantId: 12,
            agencies: [{ agencyId: '21', roleSetKey: 'CONSULTANT_DEFAULT' }],
            topicIds: [],
        });
    },
};

/** "Fertig" returns to the list. */
export const DoneReturnsToTheList: Story = {
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await userEvent.click(await screen.findByRole('button', { name: 'Fertig' }));
        await expect(await screen.findByTestId('list-page')).toBeVisible();
    },
};

export const MovedWithoutOpenCases: Story = {
    parameters: { msw: { handlers: handlers(moved(0)) } },
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await expect(
            await screen.findByText('Es blieben keine offenen Fälle beim bisherigen Träger zurück.'),
        ).toBeVisible();
    },
};

/** The topic of a centre with only one is pre-selected and goes with the move. */
export const MoveSendsTheTopicsPickedAtTheNewCentre: Story = {
    play: async () => {
        const dialog = await reviewMove('24103 Beratungsstelle Küste Kiel');
        await confirmMove(dialog);
        await waitFor(() => expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}/tenant`)).toHaveLength(1));
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}/tenant`)[0].body).toMatchObject({
            agencies: [{ agencyId: '22' }],
            topicIds: [13],
        });
    },
};

/**
 * A refusal keeps the edit: the dialog names the reason, and "Zurück zum Bearbeiten" returns to the
 * form with the new Träger and centre still chosen.
 */
const refusedBy = (answer: MoveAnswer, message: RegExp, extra: Partial<Story> = {}): Story => ({
    parameters: { msw: { handlers: handlers(answer) } },
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await expect(await dialog.findByRole('alert')).toHaveTextContent(message);
        await userEvent.click(
            dialog.getByRole('button', { name: wording('Zurück zum Bearbeiten', 'Back to editing') }),
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        await expect(await traegerField()).toHaveValue(NEW_TENANT.name);
        await expect(screen.getByRole('button', { name: '30159 Beratungsstelle Mitte Hannover' })).toBeVisible();
    },
    ...extra,
});

export const RefusedMultiTenancyOff = refusedBy(
    refusal(400, 'A counsellor can only change the Träger with multi-tenancy'),
    /mehrere Träger nicht aktiviert/,
);
export const RefusedSameTraeger = refusedBy(
    refusal(400, 'The consultant already belongs to this Träger'),
    /gehört bereits zu diesem Träger/,
);
export const RefusedCentreOfOtherTraeger = refusedBy(
    refusal(400, 'Selected agency ids [1] do not belong to consultant tenant 12'),
    /nicht zum neuen Träger/,
);
export const RefusedTopicsNotCovered = refusedBy(
    refusal(400, 'topic ids [11] are not covered by the selected agencies'),
    /nicht alle gewählten Themen/,
);
export const RefusedNotPlatformAdmin = refusedBy(refusal(403), /Nur Plattform-Administrator:innen/);
export const RefusedCounsellorNotFound = refusedBy(refusal(404), /nicht gefunden/);
export const RefusedLastCounsellorOfCentre = refusedBy(
    refusal(409, '', { 'X-Reason': 'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE' }),
    /letzte Beratungsperson einer noch aktiven Beratungsstelle/,
);
export const RefusedAlsoAdmin = refusedBy(
    refusal(409, 'The account also holds an admin identity and cannot change the Träger as a consultant'),
    /zusätzlich eine Administrationsrolle/,
);
export const RefusedIdentityProvider = refusedBy(refusal(503), /Anmeldedienst hat den Wechsel abgelehnt/);
export const RefusedServerError = refusedBy(refusal(500), /Wechsel ist fehlgeschlagen/);
export const RefusedNoAnswer = refusedBy(() => HttpResponse.error(), /Keine Antwort vom Server/);

/** The refusal stays on screen, next to the choices that were made. */
export const RefusalShownInTheDialog: Story = {
    parameters: RefusedLastCounsellorOfCentre.parameters,
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await expect(await dialog.findByRole('alert')).toHaveTextContent(/letzte Beratungsperson/);
    },
};

export const RefusalShownInTheDialogEnglish: Story = {
    beforeEach: english,
    parameters: RefusedLastCounsellorOfCentre.parameters,
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await expect(await dialog.findByRole('alert')).toHaveTextContent(/last one of a counselling centre/);
    },
};

export const AsksBeforeMovingEnglish: Story = {
    beforeEach: english,
    play: async () => {
        const dialog = await reviewMove();
        await expect(dialog.getByText(/Open cases stay with the previous Träger “Caritas Augsburg”/)).toBeVisible();
        await expect(sent).toHaveLength(0);
    },
};

export const PlatformAdminEnglish: Story = {
    beforeEach: english,
    play: async () => {
        await unlock();
        await expect(await screen.findByLabelText('Tenant assignment *')).toBeEnabled();
        await choose(await screen.findByLabelText('Tenant assignment *'), NEW_TENANT.name);
        await expect(screen.getByText(/saves only the Träger, counselling centres and topics/)).toBeVisible();
    },
};

export const MovedEnglish: Story = {
    beforeEach: english,
    play: async () => {
        const dialog = await reviewMove();
        await expect(dialog.getByText(/Open cases stay with the previous Träger “Caritas Augsburg”/)).toBeVisible();
        await confirmMove(dialog);
        await expect(
            await screen.findByText('3 open cases stay with the previous Träger “Caritas Augsburg”.'),
        ).toBeVisible();
    },
};

export const RefusedEnglish: Story = {
    beforeEach: english,
    ...refusedBy(
        refusal(409, '', { 'X-Reason': 'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE' }),
        /last one of a counselling centre/,
    ),
};

export const TraegerAdminSeesItReadOnlyEnglish: Story = { beforeEach: english, ...TraegerAdminSeesItReadOnly };
export const PlatformAdminPhone390: Story = { ...phone, play: PlatformAdminCanChangeTraeger.play };
export const AsksBeforeMovingPhone390: Story = { ...phone, play: AsksBeforeMoving.play };
export const MovedWithOpenCasesPhone390: Story = {
    ...phone,
    play: async () => {
        const dialog = await reviewMove();
        await confirmMove(dialog);
        await expect(
            await screen.findByText('3 offene Fälle bleiben beim bisherigen Träger „Caritas Augsburg“.'),
        ).toBeVisible();
    },
};
export const RefusedPhone390: Story = { ...phone, ...RefusedLastCounsellorOfCentre };
export const PlatformAdminDesktop1440: Story = { ...desktop, play: PlatformAdminCanChangeTraeger.play };
export const TraegerAdminReadOnlyPhone390: Story = { ...phone, ...TraegerAdminSeesItReadOnly };
