import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { PersonCell } from './PersonCell';

/** Name column of the account tables: name in bold, e-mail muted below. */
const meta = {
    title: 'Molecules/UserTable/PersonCell',
    component: PersonCell,
    parameters: { layout: 'padded' },
    args: { name: 'Maria Huber', email: 'maria.huber@caritas-berlin.de' },
} satisfies Meta<typeof PersonCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Maria Huber')).toBeVisible();
        await expect(canvas.getByText('maria.huber@caritas-berlin.de')).toBeVisible();
    },
};

/** Without a name the e-mail moves up and is shown only once. */
export const EmailOnly: Story = {
    args: { name: '' },
    play: async ({ canvas }) => {
        await expect(canvas.getAllByText('maria.huber@caritas-berlin.de')).toHaveLength(1);
    },
};
