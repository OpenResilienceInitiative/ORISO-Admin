import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { MuiRadioGroupField } from './index';

const meta = {
    title: 'Atoms/MuiRadioGroupField',
    component: MuiRadioGroupField,
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
                <MuiRadioGroupField.Radio value="email">E-Mail</MuiRadioGroupField.Radio>
                <MuiRadioGroupField.Radio value="phone">Telefon</MuiRadioGroupField.Radio>
            </>
        ),
    },
} satisfies Meta<typeof MuiRadioGroupField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = {
    args: { vertical: true },
};
