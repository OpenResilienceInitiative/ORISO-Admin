import type { Meta, StoryObj } from '@storybook/react-vite';
import { M3Checkbox } from './index';

const meta = {
    title: 'Atoms/M3Checkbox',
    component: M3Checkbox,
    parameters: { layout: 'padded' },
    args: {
        label: 'Beispiel-Checkbox',
        onChange: () => {},
    },
} satisfies Meta<typeof M3Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
    args: { checked: false },
};

export const Checked: Story = {
    args: { checked: true },
};

export const Disabled: Story = {
    args: { checked: false, disabled: true },
};
