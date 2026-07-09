import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormRadioGroupField } from './index';

const meta = {
    title: 'Atoms/FormRadioGroupField',
    component: FormRadioGroupField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'contactType',
        labelKey: 'Kontaktart',
        children: (
            <>
                <FormRadioGroupField.Radio value="email">E-Mail</FormRadioGroupField.Radio>
                <FormRadioGroupField.Radio value="phone">Telefon</FormRadioGroupField.Radio>
            </>
        ),
    },
} satisfies Meta<typeof FormRadioGroupField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = {
    args: { vertical: true },
};
