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

/**
 * „Mich selbst eintragen" (#1026 slice 3): the admin takes a role in a
 * Beratungsstelle with their own account — no invite e-mail. A counsellor
 * joining an agency with several topics picks at least one; the dialog lists
 * where the admin is already entered.
 */
const meta = {
    title: 'Organisms/Pages/Links/SelfAssignDialog',
    component: SelfAssignDialog,
    decorators: [withAdminProviders],
    args: {
        viewerScope: 'tenant',
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

/** BST-Admin as the role: no topics needed; a 409 from the server is explained in German. */
export const AgencyAdminConflict: Story = {
    args: {
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
        await userEvent.click(await body.findByRole('combobox', { name: /^(Rolle|Role)$/ }));
        await userEvent.click(await body.findByTitle(/BST-Admin|Agency admin/));
        const confirm = body.getByRole('button', { name: CONFIRM });
        await waitFor(() => expect(confirm).toBeEnabled());
        await userEvent.click(confirm);
        await body.findByText(/bereits in dieser Rolle eingetragen|already assigned to this Beratungsstelle/);
    },
};

/** Agency admins may only take the counsellor role — the role field is fixed. */
export const AgencyAdminViewer: Story = {
    args: { viewerScope: 'agency', initialAgency: { id: 14, name: 'Beratungsstelle Shelbyville' } },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await expect(await body.findByRole('combobox', { name: /^(Rolle|Role)$/ })).toBeDisabled();
    },
};
