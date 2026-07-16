import type { Meta, StoryObj } from '@storybook/react-vite';
import { FiveStateMatrix, clearEndAdornment, focusPlay } from './MuiFormField.matrix';
import { MuiFormField } from './index';

const meta = {
    title: 'Atoms/MuiFormField/Filled/FilledNoIconsTrailing',
    component: MuiFormField,
    parameters: { layout: 'padded', controls: { disable: true } },
} satisfies Meta<typeof MuiFormField>;

export default meta;
type Story = StoryObj;

export const InputText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{
                variant: 'filled',
                label: 'Label',
                value: 'Input text',
                endAdornment: clearEndAdornment,
            }}
        />
    ),
    play: focusPlay,
};

export const LabelText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{
                variant: 'filled',
                label: 'Label',
                endAdornment: clearEndAdornment,
            }}
        />
    ),
    play: focusPlay,
};

export const PlaceholderText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{
                variant: 'filled',
                label: 'Label',
                placeholder: 'Placeholder',
                endAdornment: clearEndAdornment,
            }}
        />
    ),
    play: focusPlay,
};
