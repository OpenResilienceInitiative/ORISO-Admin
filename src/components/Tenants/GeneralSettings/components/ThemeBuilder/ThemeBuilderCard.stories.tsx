import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { ThemeBuilder } from './index';
import { walkThroughTileHelp } from '../../../../TileHelp/tileHelpStory.matrix';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';
import { DarkScheme as DarkSchemeFrame, textContrast } from '../../../../../utils/storybook/darkSchemeStory';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/ThemeBuilderCard',
    id: 'organisms-tenants-appearance-themebuildercard',
    component: ThemeBuilder,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story) => inTheRaster(Story, 2), withAppearanceData],
} satisfies Meta<typeof ThemeBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each colour: name, one line on what it is used for, hex and contrast (#1374). */
export const InTheRaster: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() =>
            expect(
                canvas.getByText(/^(Aktive Aktionen und markante Akzente|Active actions and prominent accents)$/),
            ).toBeVisible(),
        );
        await expect(
            canvas.getByText(/^(Helle Flächen, Chips und Umrandungen|Light surfaces, chips and borders)$/),
        ).toBeVisible();
        await expect(canvas.getByText(/^(Fehler und Abbrüche|Errors and cancellations)$/)).toBeVisible();
    },
};

export const ReadOnly: Story = { args: { readOnly: true } };

export const HelpSlideshow: Story = {
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};

/**
 * Personal dark scheme (prefers-color-scheme: dark): the colour names, purpose lines and hex codes
 * follow on-surface / on-surface-variant. Hard-coded ink sank to 1.2–1.5:1 on the dark card.
 */
export const DarkScheme: Story = {
    decorators: [
        (Story) => (
            <DarkSchemeFrame>
                <Story />
            </DarkSchemeFrame>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const purpose = await canvas.findByText(
            /^(Aktive Aktionen und markante Akzente|Active actions and prominent accents)$/,
        );
        const row = purpose.closest('[class*="colorSummaryRow"]') as HTMLElement;
        const texts = row.querySelectorAll('[class*="colorLabel"], [class*="colorDescription"], [class*="colorHex"]');
        await expect(texts).toHaveLength(3);
        await expect(Math.min(...[...texts].map(textContrast))).toBeGreaterThanOrEqual(4.5);
    },
};
