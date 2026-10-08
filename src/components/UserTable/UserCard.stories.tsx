import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn } from 'storybook/test';
import { UserCard } from './UserCard';

/**
 * Phone card (< 768px): one line with name and status, the expand button next
 * to edit and delete. Details open below.
 */
const meta = {
    title: 'Molecules/UserTable/UserCard',
    component: UserCard,
    parameters: { layout: 'padded', viewport: { defaultViewport: 'phone' } },
    decorators: [(Story) => <div style={{ maxWidth: 390 }}>{Story()}</div>],
    args: {
        name: 'Maria Huber',
        email: 'maria.huber@caritas-berlin.de',
        username: 'mhuber',
        status: 'ACTIVE',
        onEdit: fn(),
        onDelete: fn(),
        children: <p style={{ margin: 0 }}>Caritas Berlin · Träger-ID 12</p>,
    },
} satisfies Meta<typeof UserCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(canvas.getByText('Maria Huber')).toBeVisible();
        await expect(canvas.getByText(/^(Aktiv|Active)$/)).toBeVisible();
        await expect(canvas.queryByText('maria.huber@caritas-berlin.de')).toBeNull();

        const toggle = canvas.getByRole('button', { name: /Details/ });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByText('maria.huber@caritas-berlin.de')).toBeVisible();
        await expect(canvas.getByText('@mhuber')).toBeVisible();
        await expect(canvas.getByText('Caritas Berlin · Träger-ID 12')).toBeVisible();

        await userEvent.click(canvas.getByRole('button', { name: /bearbeiten|Edit/ }));
        await expect(args.onEdit).toHaveBeenCalledOnce();
        await userEvent.click(canvas.getByRole('button', { name: /löschen|Delete/ }));
        await expect(args.onDelete).toHaveBeenCalledOnce();
    },
};

export const Expanded: Story = {
    args: { defaultExpanded: true, status: 'INVITED' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /Details/ })).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByRole('link', { name: /^(Eingeladen|Invited)/ })).toBeVisible();
    },
};

/** A long name gives way (ellipsis) before the actions do. */
export const LongName: Story = {
    args: { name: 'Dr. Maria-Theresia Huber-Oberndorfer von Hohenlohe', status: 'ABSENT' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /löschen|Delete/ })).toBeVisible();
    },
};
