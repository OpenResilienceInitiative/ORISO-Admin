import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form, Input } from 'antd';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ReactNode, useEffect } from 'react';
import { FormInputField } from './index';
import { FloatingLabelInput } from '../FloatingLabelInput';

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

/** The floating label must cover the top border while focused and after entering a value. */
export const ShortLabelClearsOutline: Story = {
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByLabelText('Name');
        const label = canvasElement.querySelector<HTMLLabelElement>('label[for]');
        const outline = input.closest<HTMLElement>('[data-field-outline]');
        if (!label || !outline) throw new Error('Expected the label and field outline');

        const expectLabelOverBorder = async () => {
            await waitFor(() => {
                const labelRect = label.getBoundingClientRect();
                const outlineRect = outline.getBoundingClientRect();
                expect(labelRect.top).toBeLessThan(outlineRect.top);
                expect(labelRect.bottom).toBeGreaterThan(outlineRect.top);
                // Labels ignore pointer events in production; temporarily enable them
                // to test the actual painted stacking order at the outline crossing.
                const previous = label.style.pointerEvents;
                label.style.pointerEvents = 'auto';
                try {
                    expect(document.elementFromPoint(labelRect.left + 2, outlineRect.top + 0.5)).toBe(label);
                } finally {
                    label.style.pointerEvents = previous;
                }
            });
        };

        await userEvent.click(input);
        await expectLabelOverBorder();
        await userEvent.type(input, 'A');
        await userEvent.tab();
        await expectLabelOverBorder();
    },
};

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

/** Long labels stay inside the outlined field at narrow widths in both states. */
export const LongLabel: Story = {
    args: {
        labelKey: 'Bezeichnung und Rechtsform des Trägers der Beratungsstelle',
        placeholderKey: 'Bezeichnung und Rechtsform des Trägers der Beratungsstelle',
        required: true,
    },
    decorators: [
        (Story) => (
            <div style={{ width: 240 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByLabelText(/Bezeichnung und Rechtsform/);
        await expect(input).toHaveAttribute('title', 'Bezeichnung und Rechtsform des Trägers der Beratungsstelle *');
        const label = canvasElement.querySelector('label[for]');
        if (!label) throw new Error('Expected an accessible field label');
        const outline = input.closest('[data-field-outline]');
        if (!outline) throw new Error('Expected the field outline');
        const expectReadable = async () => {
            await waitFor(() => {
                expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
                expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(
                    outline.getBoundingClientRect().top + 1,
                );
            });
            await expect(label).toHaveTextContent('Bezeichnung und Rechtsform des Trägers der Beratungsstelle *');
        };
        await expectReadable();
        const restingSize = getComputedStyle(label).fontSize;
        const restingHeight = label.getBoundingClientRect().height;
        await userEvent.click(input);
        await expectReadable();
        await expect(getComputedStyle(label).fontSize).toBe(restingSize);
        await expect(label.getBoundingClientRect().height).toBe(restingHeight);
        await userEvent.tab();
        await expectReadable();
    },
};

export const LongPasswordLabel: Story = {
    render: () => (
        <div style={{ width: 240 }}>
            <FloatingLabelInput
                component={Input.Password}
                label="Bezeichnung und Rechtsform des Trägers der Beratungsstelle *"
            />
        </div>
    ),
    play: LongLabel.play,
};

export const LongTextareaLabel: Story = {
    render: () => (
        <div style={{ width: 240 }}>
            <FloatingLabelInput
                component={Input.TextArea}
                label="Bezeichnung und Rechtsform des Trägers der Beratungsstelle *"
            />
        </div>
    ),
    play: LongLabel.play,
};

export const PasswordLabelAndVisibilityControl: Story = {
    render: () => (
        <div style={{ width: 240 }}>
            <FloatingLabelInput component={Input.Password} label="Passwort der Beratungsstelle" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByLabelText('Passwort der Beratungsstelle');
        const label = canvasElement.querySelector('label[for]');
        const visibility = canvasElement.querySelector('.ant-input-suffix');
        if (!label || !visibility) throw new Error('Expected label and password visibility control');
        await waitFor(() => {
            const labelBounds = label.getBoundingClientRect();
            const visibilityBounds = visibility.getBoundingClientRect();
            expect(labelBounds.bottom <= visibilityBounds.top || labelBounds.right <= visibilityBounds.left).toBe(true);
            expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
        });
        await userEvent.click(input);
        await expect(input).toHaveFocus();
    },
};
