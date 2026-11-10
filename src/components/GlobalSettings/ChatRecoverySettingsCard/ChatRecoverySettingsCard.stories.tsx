import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export is not resolved by ESLint 7.
import { expect, fn, userEvent, within } from 'storybook/test';
import { CardGrid } from '../../CardGrid';
import { walkThroughTileHelp } from '../../TileHelp/tileHelpStory.matrix';
import { ChatRecoverySettingsCard } from '.';

const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/ChatRecoverySettingsCard',
    id: 'organisms-globalsettings-chatrecoverysettingscard',
    component: ChatRecoverySettingsCard,
    args: {
        data: { asker: 'LOGIN_PASSWORD', consultant: 'LOGIN_PASSWORD', revision: 1 },
        isLoading: false,
        isSaving: false,
        onSave: fn(),
    },
} satisfies Meta<typeof ChatRecoverySettingsCard>;

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

/** As it sits on the page, so the use of the free space shows. Narrow the viewport to see it adapt. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <ChatRecoverySettingsCard {...args} />
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
