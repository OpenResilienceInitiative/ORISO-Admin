import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TranslationApiError } from '../../../api/tenant/translation';
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

/** "Schlüssel testen" sends one short sentence to the provider and shows the reply (Frank, 2026-11-24). */
export const KeyTestWorks: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd', mistral: 'sk-mi-…f9x2' },
        onTest: fn(async (provider) => ({
            provider,
            model: 'mistral-small-latest',
            sourceText: 'Guten Tag! Dies ist ein kurzer Verbindungstest.',
            reply: 'Good day! This is a short connection test.',
            latencyMs: 412,
        })),
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const actions = await canvas.findByTestId('translation-key-actions-mistral');
        await userEvent.click(within(actions).getByRole('button', { name: /Schlüssel testen|Test key/ }));
        await expect(args.onTest).toHaveBeenCalledWith('mistral');
        const result = await canvas.findByTestId('translation-key-test-result-mistral');
        await expect(result).toHaveTextContent('Good day! This is a short connection test.');
    },
};

/** A rejected key: the reason in plain words, never the raw error code. */
export const KeyTestRejected: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd' },
        onTest: fn(async () => {
            throw new TranslationApiError('TRANSLATION_KEY_INVALID', 'openrouter');
        }),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const actions = await canvas.findByTestId('translation-key-actions-openrouter');
        await userEvent.click(within(actions).getByRole('button', { name: /Schlüssel testen|Test key/ }));
        const result = await canvas.findByTestId('translation-key-test-result-openrouter');
        await expect(result).not.toHaveTextContent('TRANSLATION_KEY_INVALID');
    },
};
