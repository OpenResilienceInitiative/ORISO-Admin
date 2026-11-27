import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fn, userEvent, within } from 'storybook/test';
import { ThemeProvider } from '@mui/material/styles';
import { orisoMuiTheme } from '../../../theme/orisoMuiTheme';
import { CardGrid } from '../../CardGrid';
import { walkThroughTileHelp } from '../../TileHelp/tileHelpStory.matrix';
import { AccountInactivitySettingsCard } from '.';

const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/AccountInactivitySettingsCard',
    id: 'organisms-globalsettings-accountinactivitysettingscard',
    component: AccountInactivitySettingsCard,
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
        data: { askerMonths: 24, consultantMonths: 24, otherMonths: 24, revision: 0 },
        isLoading: false,
        isSaving: false,
        onSave: fn(),
    },
} satisfies Meta<typeof AccountInactivitySettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Loading: Story = { args: { data: undefined, isLoading: true } };
export const LoadError: Story = { args: { data: undefined, error: new Error('network') } };
export const Editable: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        await expect(canvas.getAllByRole('spinbutton')[0]).toBeEnabled();
    },
};

export const SavePeriod: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: /edit|bearbeiten/i }));
        const asker = canvas.getAllByRole('spinbutton')[0];
        await userEvent.clear(asker);
        await userEvent.type(asker, '12');
        await userEvent.click(canvas.getByRole('button', { name: /save|speichern/i }));
        await expect(args.onSave).toHaveBeenCalledWith(
            { askerMonths: 12, consultantMonths: 24, otherMonths: 24, revision: 0 },
            expect.anything(),
        );
    },
};

/** As it sits on the page, beside a taller tile, so the free space shows. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <AccountInactivitySettingsCard {...args} />
            </CardGrid.Item>
            <CardGrid.Item>
                <div style={{ height: 760 }} />
            </CardGrid.Item>
        </CardGrid>
    ),
};

/** The explanation behind the info button, one slide after the other. */
export const HelpSlideshow: Story = {
    ...InTheRaster,
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};
