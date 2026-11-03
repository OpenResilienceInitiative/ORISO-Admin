import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopicsSettings } from './index';

const meta = {
    title: 'Organisms/AppSettings/TopicsSettings',
    component: TopicsSettings,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof TopicsSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnlyCatalogue: Story = {};
