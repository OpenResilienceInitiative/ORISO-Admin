import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyToClipboard } from './index';

const meta = {
    title: 'Molecules/CopyToClipboard',
    component: CopyToClipboard,
    parameters: { layout: 'padded' },
    args: {
        children: 'https://beratung.example.org/agency/42',
    },
} satisfies Meta<typeof CopyToClipboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Renders its text next to a copy icon; clicking copies and shows a success toast. */
export const Default: Story = {};

/** Short token — useful for IDs / slugs. */
export const ShortValue: Story = {
    args: { children: 'AB12-CD34' },
};
