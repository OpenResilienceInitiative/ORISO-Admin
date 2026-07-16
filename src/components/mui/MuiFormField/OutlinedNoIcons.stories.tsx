import type { Meta, StoryObj } from '@storybook/react-vite';
import { FiveStateMatrix, focusPlay } from './MuiFormField.matrix';
import { MuiFormField } from './index';

const meta = {
    title: 'Atoms/MuiFormField/Outlined/OutlinedNoIcons',
    component: MuiFormField,
    parameters: { layout: 'padded', controls: { disable: true } },
} satisfies Meta<typeof MuiFormField>;

export default meta;
type Story = StoryObj;

export const InputText: Story = {
    render: () => (
        <FiveStateMatrix config={{ variant: 'outlined', label: 'Label', value: 'Input text' }} />
    ),
    play: focusPlay,
};

export const LabelText: Story = {
    render: () => <FiveStateMatrix config={{ variant: 'outlined', label: 'Label' }} />,
    play: focusPlay,
};

export const PlaceholderText: Story = {
    render: () => (
        <FiveStateMatrix
            config={{ variant: 'outlined', label: 'Label', placeholder: 'Placeholder' }}
        />
    ),
    play: focusPlay,
};
