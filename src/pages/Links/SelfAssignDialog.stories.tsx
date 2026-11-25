import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type { SelfAssignmentRequest, SelfAssignmentResult } from '../../api/accountInvites/selfAssignments';
import { SelfAssignDialog } from './SelfAssignDialog';

const AGENCY = { id: 12, name: 'Beratungsstelle Springfield Mitte', topics: ['Sucht', 'Schulden', 'Familie'] };
const TOPICS: Record<number, { id: number; name: string }[]> = {
    12: [
        { id: 2, name: 'Sucht' },
        { id: 5, name: 'Schulden' },
        { id: 7, name: 'Familie' },
    ],
    14: [{ id: 2, name: 'Sucht' }],
};

/** The admin joins a Beratungsstelle as counsellor with their own account, without an invite e-mail. */
const meta = {
    title: 'Organisms/Pages/Links/SelfAssignDialog',
    component: SelfAssignDialog,
    decorators: [withAdminProviders],
    args: {
        initialAgency: AGENCY,
        searchAgencies: async () => [AGENCY, { id: 14, name: 'Beratungsstelle Shelbyville', topics: ['Sucht'] }],
        loadAgencyTopics: async (agencyId: number) => TOPICS[agencyId] ?? [],
        loadAssignments: async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [14] }),
        assign: fn(async ({ role, agencyId }) => ({
            role,
            agencyId,
            userId: 'u-1',
            consultantIdentityCreated: true,
        })),
        onClose: fn(),
        onAssigned: fn(),
    },
} satisfies Meta<typeof SelfAssignDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const CONFIRM = /^(Eintragen|Assign)$/;

/** Träger admin, agency with three topics: „Eintragen" waits for a topic, then assigns as Berater:in. */
export const CounsellorWithTopics: Story = {
    play: async ({ args, canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await body.findByText(/Berater:in in Nr\. 14|counsellor in no\. 14/);
        const confirm = await body.findByRole('button', { name: CONFIRM });
        await body.findByText(/mehrere Themen|several topics/);
        await expect(confirm).toBeDisabled();

        await userEvent.click(
            body.getByRole('combobox', { name: /Themen, in denen Sie beraten|Topics you counsel on/ }),
        );
        await userEvent.click(await body.findByTitle('Schulden'));
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(confirm).toBeEnabled());
        // With a topic picked, the status line carries the summary; it must not appear a second time.
        await expect(body.getAllByText(/Berater:in in Nr\. 14|counsellor in no\. 14/)).toHaveLength(1);
        await userEvent.click(confirm);

        await waitFor(() =>
            expect(args.assign).toHaveBeenCalledWith({ role: 'COUNSELLOR', agencyId: 12, topicIds: [5] }),
        );
        await expect(args.onAssigned).toHaveBeenCalled();
    },
};

/** Already a counsellor there: the dialog says so and keeps „Eintragen" off. */
export const AlreadyAssigned: Story = {
    args: { loadAssignments: async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [12] }) },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await body.findByText(/bereits in dieser Rolle eingetragen|already assigned to this Beratungsstelle/);
        await expect(body.getByRole('button', { name: CONFIRM })).toBeDisabled();
    },
};

/** A double click answers 409; the dialog explains it in German. */
export const AlreadyAssignedConflict: Story = {
    args: {
        initialAgency: { id: 14, name: 'Beratungsstelle Shelbyville' },
        loadAssignments: async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [] }),
        assign: fn(
            (request: SelfAssignmentRequest): Promise<SelfAssignmentResult> =>
                Promise.reject(
                    Object.assign(
                        new Response(null, { status: 409, headers: { 'X-Reason': 'SELF_ASSIGNMENT_ALREADY_EXISTS' } }),
                        { request },
                    ),
                ),
        ),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const confirm = await body.findByRole('button', { name: CONFIRM });
        await waitFor(() => expect(confirm).toBeEnabled());
        await userEvent.click(confirm);
        await body.findByText(/bereits in dieser Rolle eingetragen|already assigned to this Beratungsstelle/);
    },
};

/** An agency without topics answers 400; the server's reason is shown. */
export const AgencyWithoutTopics: Story = {
    args: {
        initialAgency: { id: 16, name: 'Beratungsstelle ohne Themen' },
        loadAssignments: async () => ({ agencyAdminAgencyIds: [], counsellorAgencyIds: [] }),
        assign: fn(
            (request: SelfAssignmentRequest): Promise<SelfAssignmentResult> =>
                Promise.reject(
                    Object.assign(
                        new Response(JSON.stringify({ message: 'Die Beratungsstelle hat noch keine Themen.' }), {
                            status: 400,
                        }),
                        { request },
                    ),
                ),
        ),
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        const confirm = await body.findByRole('button', { name: CONFIRM });
        await waitFor(() => expect(confirm).toBeEnabled());
        await userEvent.click(confirm);
        await body.findByText('Die Beratungsstelle hat noch keine Themen.');
    },
};

/** Self-assignment is counsellor only, for every viewer: the role field is fixed. */
export const TenantAdminCounsellorOnly: Story = {
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByRole('combobox', { name: /^(Rolle|Role)$/ })).toBeDisabled();
    },
};
