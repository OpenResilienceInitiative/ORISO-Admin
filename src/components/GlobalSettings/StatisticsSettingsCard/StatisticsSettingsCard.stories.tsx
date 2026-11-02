import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import type { StatisticsSettings } from '../../../types/StatisticsSettings';
import { StatisticsSettingsCard } from '.';

const thresholds = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];
const settings: StatisticsSettings = {
    revision: 5,
    settings: [
        {
            key: 'agencyMinimumCounsellors',
            value: '2',
            defaultValue: '5',
            options: thresholds,
            effectiveFrom: '2026-11-01T09:30',
            changedBy: 'platform.admin',
        },
        {
            key: 'tenantMinimumCounsellors',
            value: '5',
            defaultValue: '5',
            options: thresholds,
            effectiveFrom: '2026-10-20T08:00',
            changedBy: null,
        },
        {
            key: 'platformMinimumCounsellors',
            value: '5',
            defaultValue: '5',
            options: thresholds,
            effectiveFrom: '2026-10-20T08:00',
            changedBy: null,
        },
        {
            key: 'messageCountTracking',
            value: 'ENABLED',
            defaultValue: 'ENABLED',
            options: ['ENABLED', 'DISABLED'],
            effectiveFrom: null,
            changedBy: null,
        },
        {
            key: 'requestChartWeeks',
            value: '12',
            defaultValue: '5',
            options: ['5', '8', '12', '16', '20', '26'],
            effectiveFrom: '2026-11-01T10:00',
            changedBy: 'platform.admin',
        },
        {
            key: 'topicMonths',
            value: '4',
            defaultValue: '4',
            options: ['3', '4', '6', '12'],
            effectiveFrom: '2026-11-01T08:00',
            changedBy: null,
        },
    ],
};

const meta = {
    title: 'Organisms/GlobalSettings/StatisticsSettingsCard',
    component: StatisticsSettingsCard,
    decorators: [
        (Story) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: 400 }}>
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    args: {
        data: settings,
        isLoading: false,
        isSaving: false,
        onSave: fn(),
        loadProtocol: fn(async () => []),
    },
} satisfies Meta<typeof StatisticsSettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { data: undefined, isLoading: true } };
export const LoadError: Story = { args: { data: undefined, error: new Error('network') } };
export const Editable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await expect(canvas.getAllByRole('combobox')[0]).toBeEnabled();
    },
};
