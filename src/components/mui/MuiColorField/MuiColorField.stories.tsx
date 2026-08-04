import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { MuiColorField } from './index';

const meta = {
    title: 'Atoms/MuiColorField',
    component: MuiColorField,
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
} satisfies Meta<typeof MuiColorField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
    args: { disabled: true },
};
