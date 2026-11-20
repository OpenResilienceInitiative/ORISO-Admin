import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import type { StatisticsSettings } from '../../../types/StatisticsSettings';
import { CardGrid } from '../../CardGrid';
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
        {
            key: 'agencySnapshotInterval',
            value: 'DAILY',
            defaultValue: 'DAILY',
            options: ['LIVE', 'DAILY', 'WEEKLY'],
            effectiveFrom: '2026-11-02T08:00',
            changedBy: null,
        },
        {
            key: 'tenantSnapshotInterval',
            value: 'DAILY',
            defaultValue: 'DAILY',
            options: ['LIVE', 'DAILY', 'WEEKLY'],
            effectiveFrom: '2026-11-02T08:00',
            changedBy: null,
        },
        {
            key: 'platformSnapshotInterval',
            value: 'WEEKLY',
            defaultValue: 'DAILY',
            options: ['LIVE', 'DAILY', 'WEEKLY'],
            effectiveFrom: '2026-11-02T10:00',
            changedBy: 'platform.admin',
        },
    ],
};

const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/StatisticsSettingsCard',
    id: 'organisms-globalsettings-statisticssettingscard',
    component: StatisticsSettingsCard,
    decorators: [
        (Story, { parameters }) => (
            <ThemeProvider theme={orisoMuiTheme}>
                <div style={{ maxWidth: parameters.tileWidth ?? 400 }}>
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

/** ORISO-Admin#1315: as it sits on the page, the whole row wide. Narrow the viewport to see the columns adapt. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item span={3}>
                <StatisticsSettingsCard {...args} />
            </CardGrid.Item>
        </CardGrid>
    ),
};

/** The explanation behind the info button, one slide after the other. */
export const HelpSlideshow: Story = {
    ...InTheRaster,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /erklärung öffnen|open explanation/i }));
        const dialog = within(canvasElement.ownerDocument.body);
        await waitFor(() => expect(dialog.getByRole('dialog')).toBeVisible());
        await userEvent.click(dialog.getByRole('button', { name: /weiter|next/i }));
        await waitFor(() => expect(dialog.getByText(/schritt 2 von 5|step 2 of 5/i)).toBeVisible());
    },
};

export const Loading: Story = { args: { data: undefined, isLoading: true } };
export const LoadError: Story = { args: { data: undefined, error: new Error('network') } };
export const Editable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await expect(canvas.getAllByRole('combobox')[0]).toBeEnabled();
    },
};

/** Three separate stand fields, each with its explanation (UserService#1547). */
export const StandFields: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);

        const help = await canvas.findAllByRole('button', { name: /fester Stand|fixed snapshot/i });
        await expect(help).toHaveLength(1);
        // The names stand above the fields, not squeezed into the select's border.
        await expect(canvasElement.querySelectorAll('.MuiInputLabel-root')).toHaveLength(0);
        await userEvent.hover(help[0]);
        const tooltip = await body.findByRole('tooltip');
        await expect(tooltip).toHaveTextContent(/24/);
        await expect(getComputedStyle(tooltip.querySelector('.MuiTooltip-tooltip') as Element).backgroundColor).toBe(
            'rgb(0, 0, 0)',
        );
        await userEvent.unhover(help[0]);

        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await userEvent.click(canvas.getByLabelText(/^(Beratungsstellen|Counselling centres)/));
        const weight = async (name: RegExp) =>
            Number(getComputedStyle(await body.findByRole('option', { name })).fontWeight);
        await expect(await weight(/Täglich|Daily/)).toBeGreaterThanOrEqual(600);
        await expect(await weight(/Live/)).toBeLessThan(600);
        await userEvent.click(await body.findByRole('option', { name: /Wöchentlich|Weekly/i }));
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));

        await expect(args.onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                values: expect.objectContaining({ agencySnapshotInterval: 'WEEKLY' }),
                revision: 5,
            }),
            expect.anything(),
        );
    },
};
