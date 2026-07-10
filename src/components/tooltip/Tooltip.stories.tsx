import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip, DIRECTION_TOP, DIRECTION_BOTTOM, DIRECTION_LEFT, DIRECTION_RIGHT } from './Tooltip';
import CustomInfoIcon from '../CustomIcons/Info';

const meta = {
    title: 'Atoms/Tooltip',
    component: Tooltip,
    parameters: { layout: 'centered' },
    // Give the popover room so it is not clipped by the canvas edges.
    decorators: [
        (Story) => (
            <div style={{ padding: 80 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        trigger: <CustomInfoIcon style={{ fontSize: 22 }} />,
        children: 'Hover (or tap) the icon to reveal this hint.',
    },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default direction (below the trigger). Hover the icon to reveal the content. */
export const Bottom: Story = {
    args: { direction: DIRECTION_BOTTOM },
};

export const Top: Story = {
    args: { direction: DIRECTION_TOP },
};

export const Left: Story = {
    args: { direction: DIRECTION_LEFT },
};

export const Right: Story = {
    args: { direction: DIRECTION_RIGHT },
};
