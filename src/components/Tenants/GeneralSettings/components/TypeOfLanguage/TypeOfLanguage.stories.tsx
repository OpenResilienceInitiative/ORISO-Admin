import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypeOfLanguage } from './index';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/TypeOfLanguage',
    id: 'organisms-tenants-appearance-typeoflanguage',
    component: TypeOfLanguage,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story) => inTheRaster(Story), withAppearanceData],
} satisfies Meta<typeof TypeOfLanguage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };
