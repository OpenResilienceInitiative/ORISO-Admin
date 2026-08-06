import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from './index';

const meta = {
    title: 'Atoms/Box',
    component: Box,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'Inhalt einer Box-Karte im Admin-Panel.',
    },
};
