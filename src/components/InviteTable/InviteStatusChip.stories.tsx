import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor } from 'storybook/test';
import { InviteStatusChip } from './InviteStatusChip';

/**
 * Send-state chip of the invite list. Tonal; dead states (expired, revoked,
 * superseded) use the magenta error role. The hint is reachable by keyboard.
 */
const meta = {
    title: 'Molecules/InviteTable/StatusChip',
    component: InviteStatusChip,
    parameters: { layout: 'centered' },
    args: {
        label: 'Gesendet',
        hint: 'Die Einladungs-E-Mail wurde versendet und wartet darauf, angenommen zu werden.',
    },
} satisfies Meta<typeof InviteStatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sent: Story = {
    play: async ({ canvas, userEvent }) => {
        await userEvent.tab();
        await expect(canvas.getByText('Gesendet')).toHaveFocus();
        await expect(await waitFor(() => canvas.getByRole('tooltip'))).toHaveTextContent(/wartet darauf/);
    },
};

export const Dead: Story = {
    args: {
        label: 'Abgelaufen',
        hint: 'Die Gültigkeit der Einladung ist abgelaufen — der Link funktioniert nicht mehr.',
        dead: true,
    },
    play: async ({ canvas }) => {
        const chip = canvas.getByText('Abgelaufen');
        await expect(chip).toHaveAttribute('data-dead', 'true');
    },
};
