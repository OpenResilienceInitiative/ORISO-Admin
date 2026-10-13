import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { RelativeTime } from './RelativeTime';

const NOW = new Date('2026-09-25T12:00:00+02:00');

/** Relative time („vor 3 Tagen") with the exact date and time in the tooltip. */
const meta = {
    title: 'Molecules/UserTable/RelativeTime',
    component: RelativeTime,
    parameters: { layout: 'padded' },
    args: { value: '2026-09-22T09:30:00+02:00', now: NOW },
} satisfies Meta<typeof RelativeTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DaysAgo: Story = {
    play: async ({ canvasElement }) => {
        const time = canvasElement.querySelector('time');
        await expect(time).toHaveTextContent(/vor 3 Tagen|3 days ago/);
        await expect(time).toHaveAttribute('datetime', '2026-09-22T09:30:00+02:00');
        await expect(time?.getAttribute('title')).toMatch(/22\.09\.2026|09\/22\/2026/);
    },
};

export const Yesterday: Story = {
    args: { value: '2026-09-24T08:00:00+02:00' },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('time')).toHaveTextContent(/gestern|yesterday/);
    },
};

export const MinutesAgo: Story = {
    args: { value: '2026-09-25T11:48:00+02:00' },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('time')).toHaveTextContent(/vor 12 Minuten|12 minutes ago/);
    },
};
