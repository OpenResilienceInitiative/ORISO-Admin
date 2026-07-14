import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormColorSelectorField } from './index';

const meta = {
    title: 'Atoms/FormColorSelectorField',
    component: FormColorSelectorField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }} initialValues={{ primaryColor: '#a5000a' }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'primaryColor',
        labelKey: 'Primärfarbe',
    },
} satisfies Meta<typeof FormColorSelectorField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
    args: { disabled: true },
};
