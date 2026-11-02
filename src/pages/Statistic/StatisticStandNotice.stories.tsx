import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, within } from 'storybook/test';
import { StatisticStandNotice } from './StatisticStandNotice';

const meta = {
    title: 'Organisms/Statistic/StatisticStandNotice',
    component: StatisticStandNotice,
    args: { generatedAt: '2026-11-04T05:00:00Z', snapshotInterval: 'DAILY' },
} satisfies Meta<typeof StatisticStandNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Daily: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/2026.*06:00|2026.*6:00/)).toBeVisible();
    },
};
export const Weekly: Story = { args: { generatedAt: '2026-11-02T05:00:00Z', snapshotInterval: 'WEEKLY' } };
export const Live: Story = { args: { snapshotInterval: 'LIVE' } };
