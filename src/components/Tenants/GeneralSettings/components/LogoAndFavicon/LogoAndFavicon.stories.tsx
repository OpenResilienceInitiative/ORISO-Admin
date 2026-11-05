import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogoAndFavicon } from './index';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

const meta = {
    title: 'Settings/Einstellungen/Erscheinungsbild/LogoAndFavicon',
    id: 'organisms-tenants-appearance-logoandfavicon',
    component: LogoAndFavicon,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story) => inTheRaster(Story, 2), withAppearanceData],
} satisfies Meta<typeof LogoAndFavicon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };
