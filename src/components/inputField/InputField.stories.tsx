import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputField } from './InputField';

const meta = {
    title: 'Atoms/InputField',
    component: InputField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div style={{ maxWidth: 360 }}>
                <Story />
            </div>
        ),
    ],
    args: {
        inputHandle: () => {},
    },
} satisfies Meta<typeof InputField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        item: { id: 'name', type: 'text', name: 'name', label: 'Name', content: '' },
    },
};

export const Filled: Story = {
    args: {
        item: { id: 'name-filled', type: 'text', name: 'name', label: 'Name', content: 'Max Mustermann' },
    },
};

export const Password: Story = {
    args: {
        item: { id: 'password', type: 'password', name: 'password', label: 'Passwort', content: '' },
    },
};

export const Invalid: Story = {
    args: {
        item: {
            id: 'invalid',
            type: 'text',
            name: 'email',
            label: 'E-Mail',
            content: 'keine-email',
            labelState: 'invalid',
            infoText: 'Bitte eine gültige E-Mail-Adresse eingeben.',
        },
    },
};

export const Disabled: Story = {
    args: {
        item: { id: 'disabled', type: 'text', name: 'name', label: 'Name', content: 'Gesperrt', disabled: true },
    },
};
