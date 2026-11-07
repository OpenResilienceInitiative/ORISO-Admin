import type { Meta, StoryObj } from '@storybook/react-vite';
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

export const InTheRaster: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };

export const HelpSlideshow: Story = {
    play: async ({ canvasElement }) => walkThroughTileHelp(canvasElement, 3),
};
