import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormInputField } from './index';

const meta = {
    title: 'Atoms/FormInputField',
    component: FormInputField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'name',
        labelKey: 'Name',
        placeholderKey: 'Name eingeben',
    },
} satisfies Meta<typeof FormInputField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
    args: { required: true },
};

export const Disabled: Story = {
    args: { disabled: true },
};
