import { ComponentProps, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactComponent as NumberV2Icon } from '../../resources/img/svg/oriso/number_v2_400_24px.svg';
import { ReactComponent as NumberV2FilledIcon } from '../../resources/img/svg/oriso/number_v2_filled_24px.svg';
import { M3DurationField, M3NumberField } from './index';

const InteractiveExample = (args: ComponentProps<typeof M3NumberField>) => {
    const [value, setValue] = useState<number | undefined>(3);

    return (
        <div style={{ maxWidth: 320 }}>
            <M3NumberField {...args} value={value} onChange={setValue} min={0} max={10} />
        </div>
    );
};

const meta = {
    title: 'Atoms/M3NumberField',
    component: M3NumberField,
    parameters: { layout: 'padded' },
    args: {
        label: 'Tenant Id',
        icon: <NumberV2Icon />,
        onChange: () => {},
    },
} satisfies Meta<typeof M3NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Outlined: Story = {
    args: { variant: 'outlined' },
};

export const Tonal: Story = {
    args: {
        icon: <NumberV2FilledIcon />,
        variant: 'tonal',
    },
};

export const Filled: Story = {
    args: {
        icon: <NumberV2FilledIcon />,
        variant: 'filled',
    },
};

export const Primary: Story = {
    args: {
        icon: <NumberV2FilledIcon />,
        variant: 'primary',
    },
};

/** All four variants stacked, mirroring the "Redesign Number Field" Figma section. */
export const AllVariants: Story = {
    render: (args) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 320 }}>
            {/* Icon-set rule: 200-weight glyph on the outlined resting state,
                filled glyph on the selected/filled variants. */}
            <M3NumberField {...args} variant="outlined" />
            <M3NumberField {...args} icon={<NumberV2FilledIcon />} variant="tonal" />
            <M3NumberField {...args} icon={<NumberV2FilledIcon />} variant="filled" />
            <M3NumberField {...args} icon={<NumberV2FilledIcon />} variant="primary" />
        </div>
    ),
};

/** Controlled example: typing, chevrons and arrow keys stay within min/max. */
export const Interactive: Story = {
    render: (args) => <InteractiveExample {...args} />,
};

export const Disabled: Story = {
    args: { variant: 'outlined', value: 42, disabled: true },
};

export const AutoWithIntegratedAction: Story = {
    args: {
        displayText: 'Auto',
        trailing: <button type="button">Auto</button>,
    },
};

export const ReadOnly: Story = {
    args: { value: 42, readOnly: true },
};

export const SessionDuration = {
    render: () => (
        <div style={{ maxWidth: 420 }}>
            <M3DurationField label="Maximum Session Duration" value={180} onChange={() => {}} />
        </div>
    ),
} satisfies StoryObj<typeof M3DurationField>;

export const SessionDurationReadOnly = {
    render: () => (
        <div style={{ maxWidth: 420 }}>
            <M3DurationField label="Maximum Session Duration" value={180} readOnly />
        </div>
    ),
} satisfies StoryObj<typeof M3DurationField>;
