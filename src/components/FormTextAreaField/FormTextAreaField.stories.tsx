import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormTextAreaField } from './index';

const meta = {
    title: 'Atoms/FormTextAreaField',
    component: FormTextAreaField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'description',
        labelKey: 'Beschreibung',
        placeholderKey: 'Beschreibung eingeben',
    },
} satisfies Meta<typeof FormTextAreaField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
    args: { required: true },
};
