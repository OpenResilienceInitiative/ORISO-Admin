import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { ThemeBuilder } from './index';
import { walkThroughTileHelp } from '../../../../TileHelp/tileHelpStory.matrix';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

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
