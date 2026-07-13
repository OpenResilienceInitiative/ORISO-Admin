import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormInputPasswordField } from './index';

const meta = {
    title: 'Atoms/FormInputPasswordField',
    component: FormInputPasswordField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'password',
        labelKey: 'Passwort',
        placeholderKey: 'Passwort eingeben',
    },
} satisfies Meta<typeof FormInputPasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Required: Story = {
    args: { required: true },
};
