import type { Meta, StoryObj } from '@storybook/react-vite';
import { TourOverviewSection } from '../../components/productTour/TourOverviewSection';
import { inTheRaster, withRoles } from './profileStory';

const meta = {
    title: 'Pages/Profile/TourOverviewSection',
    component: TourOverviewSection,
    parameters: { layout: 'padded' },
    decorators: [withRoles(['agency-admin'])],
} satisfies Meta<typeof TourOverviewSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As it sits on the page; narrow the viewport to 390 px to see it stack. */
export const InTheRaster: Story = {
    parameters: { tileWidth: 'none' },
    render: () => inTheRaster(() => <TourOverviewSection />),
};
