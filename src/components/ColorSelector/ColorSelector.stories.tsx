import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ColorSelector from './ColorSelector';

/** Wrapper that owns the color state so the picker is interactive in the story. */
const StatefulColorSelector = (args: ComponentProps<typeof ColorSelector>) => {
    const [color, setColor] = useState(args.tenantColor);
    return <ColorSelector {...args} tenantColor={color} setColorValue={(_field, value) => setColor(value)} />;
};

const meta = {
    title: 'Molecules/ColorSelector',
    component: ColorSelector,
    parameters: { layout: 'padded' },
    args: {
        isLoading: false,
        label: 'Primärfarbe',
        field: 'primaryColor',
        tenantColor: '#0a4a7a',
        setColorValue: () => {},
    },
} satisfies Meta<typeof ColorSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Swatch + HEX readout; click the swatch to open the picker. Interactive. */
export const Default: Story = {
    render: (args) => <StatefulColorSelector {...args} />,
};

/** Disabled while the tenant settings are saving. */
export const Loading: Story = {
    args: { isLoading: true },
};
