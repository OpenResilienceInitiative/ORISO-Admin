import type { Meta, StoryObj } from '@storybook/react-vite';
import { NameAndSlogan } from './index';
import { appearanceHandlers, inTheRaster, withAppearanceData } from '../appearanceStoryHarness.matrix';

const meta = {
    title: 'Settings/Einstellungen/Stammdaten & Mehr/NameAndSlogan',
    id: 'organisms-tenants-appearance-nameandslogan',
    component: NameAndSlogan,
    args: { tenantId: '1' },
    parameters: { layout: 'padded', msw: { handlers: appearanceHandlers } },
    decorators: [(Story) => inTheRaster(Story), withAppearanceData],
} satisfies Meta<typeof NameAndSlogan>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InTheRaster: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };
