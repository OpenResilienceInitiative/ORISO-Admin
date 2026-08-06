import type { Meta, StoryObj } from '@storybook/react-vite';
import { FiveStateMatrix, focusPlay, searchStartAdornment } from './MuiFormField.matrix';
import { MuiFormField } from './index';

const meta = {
    title: 'Atoms/MuiFormField/Outlined/OutlinedLeadingOnly',
    component: MuiFormField,
    parameters: { layout: 'padded', controls: { disable: true } },
} satisfies Meta<typeof MuiFormField>;

export default meta;
type Story = StoryObj;

export const InputText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{
                variant: 'outlined',
                label: 'Label',
                value: 'Input text',
                startAdornment: searchStartAdornment,
            }}
        />
    ),
    play: focusPlay,
};

export const LabelText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{
                variant: 'outlined',
                label: 'Label',
                startAdornment: searchStartAdornment,
            }}
        />
    ),
    play: focusPlay,
};

export const PlaceholderText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{
                variant: 'outlined',
                label: 'Label',
                placeholder: 'Placeholder',
                startAdornment: searchStartAdornment,
            }}
        />
    ),
    play: focusPlay,
};
