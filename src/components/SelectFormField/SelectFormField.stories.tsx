import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { SelectFormField } from './index';

const options = [
    { label: 'Berlin', value: 'berlin' },
    { label: 'Hamburg', value: 'hamburg' },
    { label: 'München', value: 'muenchen' },
];

const meta = {
    title: 'Atoms/SelectFormField',
    component: SelectFormField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'city',
        label: 'Stadt',
        options,
        placeholder: 'Stadt auswählen',
    },
} satisfies Meta<typeof SelectFormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
    args: {
        required: true,
    },
};

export const MultiSelect: Story = {
    args: {
        name: 'cities',
        label: 'Städte',
        isMulti: true,
        allowClear: true,
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
        initialValue: 'berlin',
    },
};

export const Loading: Story = {
    args: {
        loading: true,
    },
};
