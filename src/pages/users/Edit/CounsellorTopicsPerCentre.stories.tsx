import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
import { Navigate, Route, Routes } from 'react-router-dom';
import i18n from 'i18next';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { UserRole } from '../../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../../utils/storybook/adminStoryDecorators';
import { UserEditOrAdd } from '.';

const TENANT_ID = 7;
const CONSULTANT_ID = 'consultant-7';

const SUCHT = { id: 11, name: 'Sucht', status: 'ACTIVE' };
const SCHULDEN = { id: 12, name: 'Schulden', status: 'ACTIVE' };
const FAMILIE = { id: 13, name: 'Familie', status: 'ACTIVE' };

const centre = (id: number, name: string, postcode: string, city: string, topics: (typeof SUCHT)[]) => ({
    id,
    name,
    postcode,
    city,
    tenantId: TENANT_ID,
    consultingType: 1,
    teamAgency: false,
    offline: false,
    deleteDate: null,
    topics,
});
const NORD = centre(1, 'Beratungsstelle Nord', '20095', 'Hamburg', [SUCHT, SCHULDEN]);
const SUED = centre(2, 'Beratungsstelle Süd', '80331', 'München', [SUCHT, FAMILIE]);
const OST = centre(3, 'Beratungsstelle Ost', '10115', 'Berlin', [FAMILIE]);
const CENTRES = [NORD, SUED, OST];

const tr = (key: string, values?: Record<string, unknown>) => String(i18n.t(key, values));

const pickerLabel = (c: typeof NORD) =>
    tr('counselor.topicsAtAgency', { agency: `${c.name} (${c.postcode} ${c.city})` });

/** Requests the page sent, per story run; the play functions assert on them. */
let sent: { method: string; path: string; body: any }[] = [];
const record = async (request: Request) => {
    const text = await request.clone().text();
    sent.push({ method: request.method, path: new URL(request.url).pathname, body: text ? JSON.parse(text) : null });
};
const sentTo = (method: string, suffix: string) => sent.filter((r) => r.method === method && r.path.endsWith(suffix));

const handlers = (agencies: (typeof NORD)[], stored: Record<string, unknown>, searchDelayMs = 0) => {
    const consultant = {
        id: CONSULTANT_ID,
        firstname: 'Ada',
        lastname: 'Lovelace',
        email: 'ada@example.org',
        username: 'ada',
        tenantId: TENANT_ID,
        agencies,
        isSupervisor: false,
        absent: false,
        formalLanguage: true,
    };
    return [
        http.get('*/service/tenantadmin/:id', () => HttpResponse.json({ id: TENANT_ID, name: 'Demo-Träger' })),
        http.get('*/service/topic/', () => HttpResponse.json([SUCHT, SCHULDEN, FAMILIE])),
        http.get('*/service/users/consultants/search', async () => {
            await delay(searchDelayMs);
            return HttpResponse.json({ _embedded: [{ _embedded: consultant }], total: 1 });
        }),
        http.get('*/service/agencyadmin/agencies', () =>
            HttpResponse.json({ _embedded: CENTRES.map((c) => ({ _embedded: c })), total: CENTRES.length }),
        ),
        http.get('*/service/agencyadmin/agencies/:id', ({ params }) =>
            HttpResponse.json({ _embedded: CENTRES.find((c) => String(c.id) === params.id) }),
        ),
        http.put('*/service/agencyadmin/agencies/:id', async ({ request, params }) => {
            await record(request);
            return HttpResponse.json({ _embedded: CENTRES.find((c) => String(c.id) === params.id) });
        }),
        http.get(`*/service/useradmin/consultants/${CONSULTANT_ID}`, () =>
            HttpResponse.json({ _embedded: { ...consultant, ...stored } }),
        ),
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

const meta = {
    title: 'Organisms/Pages/Users/CounsellorEdit/Topics per centre',
    component: UserEditOrAdd,
    parameters: { layout: 'fullscreen' },
    beforeEach: () => {
        sent = [];
    },
    decorators: [
        (Story, context) => {
            setStoryAuth(context.parameters.roles ?? [UserRole.AgencyAdmin, UserRole.UserAdmin], TENANT_ID);
            return withAdminProviders(() => (
                <Routes>
                    <Route path="/" element={<Navigate to={`/admin/users/consultants/${CONSULTANT_ID}`} replace />} />
                    <Route path="/admin/users/:typeOfUsers/:id" element={<Story />} />
                    <Route path="/admin/users/:typeOfUsers" element={<p>Beratende</p>} />
                    <Route path="/admin/agency/add" element={<p data-testid="agency-create-page">Neue Stelle</p>} />
                </Routes>
            ));
        },
    ],
} satisfies Meta<typeof UserEditOrAdd>;

export default meta;
type Story = StoryObj<typeof meta>;

const openOptions = async (label: string) => {
    await userEvent.click(await screen.findByLabelText(label));
    const names = (await screen.findAllByRole('option')).map((option) => option.textContent);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    return names;
};

const unlock = async () => userEvent.click(await screen.findByRole('button', { name: tr('edit') }));
const save = async () => userEvent.click(screen.getByRole('button', { name: tr('save') }));

/** Two centres show two pickers, each with only its own topics. */
export const TwoCentresTwoPickers: Story = {
    parameters: {
        msw: {
            handlers: handlers([NORD, SUED], {
                topicsByAgency: [
                    { agencyId: 1, topicIds: [11] },
                    { agencyId: 2, topicIds: [13] },
                ],
            }),
        },
    },
    play: async () => {
        await unlock();
        await expect(await openOptions(pickerLabel(NORD))).toEqual(['Schulden', 'Sucht']);
        await expect(await openOptions(pickerLabel(SUED))).toEqual(['Familie', 'Sucht']);
    },
};

/** Save sends the topics per centre; flat topicIds stay as the union for older servers. */
export const SaveSendsTopicsPerCentre: Story = {
    parameters: TwoCentresTwoPickers.parameters,
    play: async () => {
        await unlock();
        await save();
        await waitFor(() => expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)).toHaveLength(1));
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)[0].body).toMatchObject({
            topicIds: [11, 13],
            topicsByAgency: [
                { agencyId: 1, topicIds: [11] },
                { agencyId: 2, topicIds: [13] },
            ],
        });
    },
};

/** Second visit: the detail record is cached, the search answers later. Topics must survive. */
export const DetailBeforeSearchKeepsTopics: Story = {
    parameters: {
        msw: {
            handlers: handlers(
                [NORD, SUED],
                {
                    topicsByAgency: [
                        { agencyId: 1, topicIds: [11] },
                        { agencyId: 2, topicIds: [13] },
                    ],
                },
                800,
            ),
        },
    },
    play: async () => {
        await unlock();
        await expect(await screen.findByRole('button', { name: 'Sucht' })).toBeVisible();
        await save();
        await waitFor(() => expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)).toHaveLength(1));
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)[0].body.topicsByAgency).toEqual([
            { agencyId: 1, topicIds: [11] },
            { agencyId: 2, topicIds: [13] },
        ]);
    },
};

/** Nord no longer offers Familie: it stays as a marked chip and an unrelated save keeps it. */
export const DroppedTopicStaysMarked: Story = {
    parameters: {
        msw: {
            handlers: handlers([NORD], {
                topicsByAgency: [{ agencyId: 1, topicIds: [11, 13] }],
                topics: [SUCHT, FAMILIE],
            }),
        },
    },
    play: async () => {
        await unlock();
        const chip = tr('counselor.topicsAtAgency.notOfferedChip', { topic: 'Familie' });
        await expect(await screen.findByRole('button', { name: chip })).toBeVisible();
        await expect(screen.getByText(tr('counselor.topicsAtAgency.notOfferedNotice'))).toBeVisible();
        await save();
        await waitFor(() => expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)).toHaveLength(1));
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)[0].body.topicIds).toBeNull();
    },
};

const moveParameters = { msw: { handlers: handlers([NORD], { topicsByAgency: [{ agencyId: 1, topicIds: [12] }] }) } };

/** Nord → Ost: Ost does not offer "Schulden", so saving asks first. */
const moveNordToOst = async () => {
    await unlock();
    await userEvent.click(screen.getByLabelText(tr('agency')));
    await userEvent.click(await screen.findByRole('option', { name: '10115 Beratungsstelle Ost Berlin' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    const nordChip = screen.getByRole('button', { name: '20095 Beratungsstelle Nord Hamburg' });
    await userEvent.click(nordChip.querySelector('.MuiChip-deleteIcon') as Element);
    await save();
    return within(await screen.findByRole('dialog'));
};

export const MoveAddsTopicAtNewCentre: Story = {
    parameters: moveParameters,
    play: async () => {
        const dialog = await moveNordToOst();
        // The dialog fades in.
        await waitFor(() => expect(dialog.getByText(/Schulden/)).toBeVisible());
        await userEvent.click(
            dialog.getByRole('button', {
                name: tr('counselor.topicsLostByMove.addToTarget', {
                    agency: 'Beratungsstelle Ost (10115 Berlin)',
                }),
            }),
        );
        await waitFor(() => expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)).toHaveLength(1));
        const agencyBody = sentTo('PUT', '/agencies/3')[0].body;
        await expect(agencyBody.topicIds).toEqual([13, 12]);
        // Only what the server would otherwise clear goes back; legal texts and settings stay out.
        await expect(agencyBody).not.toHaveProperty('content');
        await expect(agencyBody).not.toHaveProperty('settings');
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)[0].body.topicsByAgency).toEqual([
            { agencyId: 3, topicIds: [13, 12] },
        ]);
    },
};

export const MoveDropsTopic: Story = {
    parameters: moveParameters,
    play: async () => {
        const dialog = await moveNordToOst();
        await userEvent.click(dialog.getByRole('button', { name: tr('counselor.topicsLostByMove.drop') }));
        await waitFor(() => expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)).toHaveLength(1));
        await expect(sentTo('PUT', '/agencies/3')).toHaveLength(0);
        // Ost's only topic was preselected when the centre was added.
        await expect(sentTo('PUT', `/consultants/${CONSULTANT_ID}`)[0].body.topicsByAgency).toEqual([
            { agencyId: 3, topicIds: [13] },
        ]);
    },
};

export const MoveCreatesNewCentre: Story = {
    parameters: moveParameters,
    play: async () => {
        const dialog = await moveNordToOst();
        await userEvent.click(dialog.getByRole('button', { name: tr('counselor.topicsLostByMove.createCentre') }));
        await expect(await screen.findByTestId('agency-create-page')).toBeVisible();
        await expect(sent).toHaveLength(0);
    },
};

/** Without the right to edit Ost, adding the topic there is disabled and says why. */
export const MoveWithoutAgencyRight: Story = {
    parameters: { ...moveParameters, roles: [UserRole.TenantAdmin, UserRole.UserAdmin] },
    play: async () => {
        const dialog = await moveNordToOst();
        const agency = 'Beratungsstelle Ost (10115 Berlin)';
        await expect(
            dialog.getByRole('button', { name: tr('counselor.topicsLostByMove.addToTarget', { agency }) }),
        ).toBeDisabled();
        await expect(dialog.getByText(tr('counselor.topicsLostByMove.noAgencyRight', { agency }))).toBeInTheDocument();
    },
};
