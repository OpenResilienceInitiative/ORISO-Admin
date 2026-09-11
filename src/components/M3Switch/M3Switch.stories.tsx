import type { Meta, StoryObj } from '@storybook/react-vite';
import { M3Switch } from './index';

const meta = {
    title: 'Atoms/M3Switch',
    component: M3Switch,
    parameters: { layout: 'padded' },
    args: {
        label: 'Beispiel-Switch',
        onChange: () => {},
    },
} satisfies Meta<typeof M3Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
    args: { checked: false },
};

export const On: Story = {
    args: { checked: true },
};

export const OffDisabled: Story = {
    args: { checked: false, disabled: true },
};

export const OnDisabled: Story = {
    args: { checked: true, disabled: true },
};
