import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { FloatingLabelInput } from '../FloatingLabelInput';
import { CollapsibleField } from './index';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One invite-bar field: collapses to "✓ E-Mail" on blur once the address is valid. */
const Example = ({ initialValue = '' }: { initialValue?: string }) => {
    const [value, setValue] = useState(initialValue);
    const [collapsed, setCollapsed] = useState(EMAIL.test(initialValue));
    return (
        <CollapsibleField
            collapsed={collapsed}
            label="E-Mail"
            valueSummary={value}
            onExpand={() => setCollapsed(false)}
        >
            <FloatingLabelInput
                label="E-Mail"
                style={{ width: 304 }}
                value={value}
                onBlur={() => setCollapsed(EMAIL.test(value.trim()))}
                onChange={(event) => setValue(event.target.value)}
            />
        </CollapsibleField>
    );
};

const meta = {
    title: 'Molecules/CollapsibleField',
    component: Example,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resting open: nothing typed yet. */
export const Expanded: Story = {};

/** A valid value that lost focus: the compact pill, value on hover and in its accessible name. */
export const Collapsed: Story = { args: { initialValue: 'maria.huber@example.org' } };

/** Type → blur → pill → click → the field is back, caret at the end. */
export const CollapseAndExpand: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole('textbox', { name: 'E-Mail' }), 'maria.huber@example.org');
        await userEvent.tab();
        const pill = await canvas.findByRole('button', { name: /E-Mail/ });
        await userEvent.click(pill);
        const input = canvas.getByRole('textbox', { name: 'E-Mail' });
        await waitFor(() => expect(input).toHaveFocus());
        await expect((input as HTMLInputElement).selectionStart).toBe('maria.huber@example.org'.length);
    },
};
