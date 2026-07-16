import type { Meta, StoryObj } from '@storybook/react-vite';
import { SideScrollerFooter } from './index';

const meta = {
    title: 'Molecules/SideScrollerFooter',
    component: SideScrollerFooter,
    parameters: { layout: 'padded' },
    args: {
        ariaLabel: 'Karten-Navigation',
        previousLabel: 'Zurück',
        nextLabel: 'Weiter',
        onScrollBackward: () => {},
        onScrollForward: () => {},
    },
} satisfies Meta<typeof SideScrollerFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BothDisabled: Story = {
    args: {
        canScrollBackward: false,
        canScrollForward: false,
    },
};

export const ForwardOnly: Story = {
    args: {
        canScrollBackward: false,
        canScrollForward: true,
    },
};

export const BothActive: Story = {
    args: {
        canScrollBackward: true,
        canScrollForward: true,
    },
};
