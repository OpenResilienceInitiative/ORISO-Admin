import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormSwitchField } from './index';

const meta = {
    title: 'Atoms/FormSwitchField',
    component: FormSwitchField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'notifications',
        labelKey: 'Benachrichtigungen',
    },
} satisfies Meta<typeof FormSwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default M3-styled switch rendering (see also Atoms/M3Switch). */
export const Default: Story = {
    args: { switchLabel: 'Benachrichtigungen' },
};

/** Legacy antd Switch rendering. */
export const AntdVariant: Story = {
    args: { switchVariant: 'antd' },
};

/** Explicit M3-styled switch rendering. */
export const M3Variant: Story = {
    args: { switchVariant: 'm3', switchLabel: 'Benachrichtigungen' },
};
