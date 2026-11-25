import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { InviteRecipientCell } from './InviteRecipientCell';

/** Recipient column of the invite list: name, e-mail, role chip and ID hint. */
const meta = {
    title: 'Molecules/InviteTable/RecipientCell',
    component: InviteRecipientCell,
    parameters: { layout: 'padded' },
    args: {
        displayName: 'Maria Huber',
        email: 'maria.huber@caritas-berlin.de',
        roleLabel: 'Träger-Admin',
        idHint: 'Träger-ID 12',
    },
} satisfies Meta<typeof InviteRecipientCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithName: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Maria Huber')).toBeVisible();
        await expect(canvas.getByText('maria.huber@caritas-berlin.de')).toBeVisible();
        await expect(canvas.getByText('Träger-Admin')).toBeVisible();
        await expect(canvas.getByText('Träger-ID 12')).toBeVisible();
    },
};

/** No name yet: the e-mail is the name and is not repeated. */
export const EmailOnly: Story = {
    args: { displayName: 'maria.huber@caritas-berlin.de', roleLabel: 'Beratende', idHint: undefined },
    play: async ({ canvas }) => {
        await expect(canvas.getAllByText('maria.huber@caritas-berlin.de')).toHaveLength(1);
        await expect(canvas.queryByText(/Träger-ID/)).toBeNull();
    },
};
