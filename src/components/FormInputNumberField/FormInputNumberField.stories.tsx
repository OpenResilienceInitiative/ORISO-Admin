import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { ReactNode, useEffect } from 'react';
import { FormInputNumberField } from './index';

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
        min: 0,
        max: 100,
    },
} satisfies Meta<typeof FormInputNumberField>;

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
            <FillOnMount values={{ capacity: 25 }}>
                <Story />
            </FillOnMount>
        ),
    ],
};
