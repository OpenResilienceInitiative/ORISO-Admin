import type { Meta, StoryObj } from '@storybook/react-vite';
import { Languages } from './index';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/Languages',
    id: 'organisms-tenants-appearance-languages',
    component: Languages,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story) => inTheRaster(Story), withAppearanceData],
} satisfies Meta<typeof Languages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };
