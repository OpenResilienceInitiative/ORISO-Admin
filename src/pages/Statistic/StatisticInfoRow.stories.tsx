import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, within } from 'storybook/test';
import { StatisticInfoRow } from './StatisticInfoRow';

const totalReason =
    'Die Gesamtzahl wird aus Datenschutzgründen nicht angezeigt, weil sie auf zu wenigen aktiven Beratenden beruht oder die Zahlen eines kleinen Bereichs verraten würde.';

/** One quiet line above the statistic cards: stand, and only when needed, the privacy hint (Admin#1374). */
const meta = {
    title: 'Organisms/Statistic/StatisticInfoRow',
    component: StatisticInfoRow,
    decorators: [
        (Story) => (
            <div className="statisticDashboardPage">
                <Story />
            </div>
        ),
    ],
    args: { stand: { dataUntil: '2026-11-05', snapshotInterval: 'DAILY' }, privacyReasons: [] },
} satisfies Meta<typeof StatisticInfoRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const StandOnly: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Stand 05.11.2026 · neue Zahlen täglich um 6:00 Uhr')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: 'Warum?' })).toBeNull();
    },
};

export const WithProtectedValues: Story = {
    args: { privacyReasons: [totalReason] },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const why = canvas.getByRole('button', { name: 'Warum?' });
        await expect(canvas.getByText(totalReason)).not.toBeVisible();
        await userEvent.click(why);
        await expect(why).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByText(totalReason)).toBeVisible();
    },
};

export const Mobile: Story = {
    ...WithProtectedValues,
    decorators: [
        (Story) => (
            <div className="statisticDashboardPage" style={{ width: 343 }}>
                <Story />
            </div>
        ),
    ],
};
