import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export
import { expect, within } from 'storybook/test';
import { AdminNotFound } from './AdminNotFound';

const meta = {
    title: 'Pages/ErrorPages/AdminNotFound',
    component: AdminNotFound,
    parameters: {
        layout: 'padded',
        route: '/admin/does-not-exist',
        docs: {
            description: {
                component:
                    'Shown inside the Admin shell when no route answers an address (ORISO-Admin#1513), instead of a blank content area. Reuses DashboardEmptyState and offers the way back to Home.',
            },
        },
    },
} satisfies Meta<typeof AdminNotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { level: 2 })).toBeVisible();
        await expect(canvas.getByRole('button')).toBeEnabled();
    },
};

export const Phone: Story = {
    globals: { viewport: { value: 'phone390', isRotated: false } },
    play: Default.play,
};
