import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormInputNumberField } from './index';

const meta = {
    title: 'Atoms/FormInputNumberField',
    component: FormInputNumberField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'capacity',
        labelKey: 'Kapazität',
        placeholderKey: 'Anzahl eingeben',
    },
} satisfies Meta<typeof FormInputNumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
    args: { required: true },
};
