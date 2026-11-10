import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, within } from 'storybook/test';
import { StatisticStandNotice } from './StatisticStandNotice';

const meta = {
    title: 'Organisms/Statistic/StatisticStandNotice',
    component: StatisticStandNotice,
    args: { dataUntil: '2026-11-03', snapshotInterval: 'DAILY' },
} satisfies Meta<typeof StatisticStandNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Daily: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/2026.*6:00/)).toBeVisible();
    },
};
export const Weekly: Story = { args: { dataUntil: '2026-11-01', snapshotInterval: 'WEEKLY' } };
export const Live: Story = { args: { dataUntil: null, snapshotInterval: 'LIVE' } };
