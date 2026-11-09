import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogoAndFavicon } from './index';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

const meta = {
    title: 'Organisms/Tenants/Appearance/LogoAndFavicon',
    component: LogoAndFavicon,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story) => inTheRaster(Story, 3), withAppearanceData],
} satisfies Meta<typeof LogoAndFavicon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };
