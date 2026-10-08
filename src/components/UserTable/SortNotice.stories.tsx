import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { SortNotice } from './SortNotice';

/** Shown when the server rejected the chosen sort: says which order is on screen instead. */
const meta = {
    title: 'Molecules/UserTable/SortNotice',
    component: SortNotice,
    parameters: { layout: 'padded' },
    args: { shownOrder: 'Zuletzt aktualisiert, neueste zuerst' },
} satisfies Meta<typeof SortNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas }) => {
        const notice = canvas.getByRole('status');
        await expect(notice).toHaveTextContent('Zuletzt aktualisiert, neueste zuerst');
    },
};
