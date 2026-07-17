import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfigProvider, Form } from 'antd';
import { ReactNode, useEffect } from 'react';
import { FormTextAreaField } from './index';

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
    decorators: [
        (Story) => (
            <ValidateOnMount>
                <Story />
            </ValidateOnMount>
        ),
    ],
};

export const Disabled: Story = {
    // FormTextAreaField has no own disabled prop — in the app it is disabled
    // via the surrounding Form/ConfigProvider (disable, never hide).
    decorators: [
        (Story) => (
            <ConfigProvider componentDisabled>
                <Story />
            </ConfigProvider>
        ),
    ],
};

export const Filled: Story = {
    decorators: [
        (Story) => (
            <FillOnMount
                values={{
                    description:
                        'Die Beratungsstelle unterstützt Ratsuchende bei Fragen rund um Erziehung, Familie und Alltag — vertraulich und kostenfrei.',
                }}
            >
                <Story />
            </FillOnMount>
        ),
    ],
};
