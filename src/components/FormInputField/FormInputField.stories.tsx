import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ReactNode, useEffect } from 'react';
import { FormInputField } from './index';

/** Triggers validation on mount so the error state of the M3 anatomy is visible. */
const ValidateOnMount = ({ children }: { children: ReactNode }) => {
    const form = Form.useFormInstance();

    useEffect(() => {
        form.validateFields().catch(() => undefined);
    }, [form]);

    return children;
};

/** Pre-fills the field so the floated-label (filled) state is visible. */
const FillOnMount = ({ values, children }: { values: Record<string, unknown>; children: ReactNode }) => {
    const form = Form.useFormInstance();

    useEffect(() => {
        form.setFieldsValue(values);
    }, [form, values]);

    return children;
};

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
    decorators: [
        (Story) => (
            <ValidateOnMount>
                <Story />
            </ValidateOnMount>
        ),
    ],
};

export const Disabled: Story = {
    args: { disabled: true },
};

export const Filled: Story = {
    decorators: [
        (Story) => (
            <FillOnMount values={{ name: 'Konstanze Schanze' }}>
                <Story />
            </FillOnMount>
        ),
    ],
};
