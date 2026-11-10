import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardGrid } from '../../CardGrid';
import { walkThroughTileHelp } from '../../TileHelp/tileHelpStory.matrix';
import { TranslationApiKeysCard } from './index';

const meta = {
    title: 'Settings/Einstellungen/Globale Konfigurationen/TranslationApiKeysCard',
    id: 'organisms-globalsettings-translationapikeyscard',
    component: TranslationApiKeysCard,
    parameters: { layout: 'padded' },
    args: { keys: { openrouter: 'sk-or-…abcd' }, onSave: () => undefined },
} satisfies Meta<typeof TranslationApiKeysCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithStoredKeys: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd', mistral: 'sk-mi-…f9x2' },
    },
};

export const NoKeysYet: Story = {
    args: { keys: {} },
};

export const Saving: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd' },
        savingProvider: 'mistral',
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd' },
        disabled: true,
    },
};

/** As it sits on the page, so the use of the free space shows. Narrow the viewport to see it adapt. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: (args) => (
        <CardGrid raster>
            <CardGrid.Item>
                <TranslationApiKeysCard {...args} />
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
