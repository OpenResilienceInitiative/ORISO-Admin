import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopicsSettings } from './index';

const meta = {
    title: 'Settings/Einstellungen/Funktionalitäten/TopicsSettings',
    id: 'organisms-appsettings-topicssettings',
    component: TopicsSettings,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof TopicsSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnlyCatalogue: Story = {};
