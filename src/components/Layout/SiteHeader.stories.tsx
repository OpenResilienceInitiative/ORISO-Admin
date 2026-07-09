import type { Meta, StoryObj } from '@storybook/react-vite';
import SiteHeader from './SiteHeader';

const meta = {
    title: 'Molecules/SiteHeader',
    component: SiteHeader,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
