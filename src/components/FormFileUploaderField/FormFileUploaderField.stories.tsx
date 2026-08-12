import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormFileUploaderField } from './index';

const meta = {
    title: 'Atoms/FormFileUploaderField',
    component: FormFileUploaderField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'logo',
        labelKey: 'Logo',
    },
} satisfies Meta<typeof FormFileUploaderField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Disabled: Story = {
    args: { disabled: true },
};

/**
 * How the field looks inside a card that is not in edit mode: CardEditable
 * disables its whole <Form>, and the uploader has to follow that even though its
 * own `disabled` prop is false (#689).
 */
export const InsideDisabledForm: Story = {
    decorators: [
        (Story) => (
            <Form disabled style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
};
