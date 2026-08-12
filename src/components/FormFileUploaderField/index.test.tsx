import { Form } from 'antd';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormFileUploaderField } from './index';

/**
 * The uploader lives inside CardEditable, which disables its <Form> while the card
 * is in view mode. antd publishes that through DisabledContext, so the uploader has
 * to honour the context and not just its own `disabled` prop — otherwise a file
 * picked outside edit mode lands in the form state with no way to save it (#689).
 */
const renderField = ({ formDisabled, disabled }: { formDisabled: boolean; disabled?: boolean }) => {
    const changes: Record<string, unknown>[] = [];

    const { container } = render(
        <Form disabled={formDisabled} onValuesChange={(changed) => changes.push(changed)}>
            <FormFileUploaderField name="logo" labelKey="organisation.logo" disabled={disabled} />
        </Form>,
    );

    // Assert the input is really there: without it the change event below would be a
    // no-op and the "nothing happened" expectations would pass for the wrong reason.
    const input = container.querySelector('.ant-upload input[type="file"]');
    expect(input).not.toBeNull();

    return { changes, input: input as HTMLInputElement };
};

const pickPng = (input: HTMLInputElement) =>
    fireEvent.change(input, { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } });

describe('FormFileUploaderField', () => {
    it('accepts a file while the surrounding form is enabled', async () => {
        const { changes, input } = renderField({ formDisabled: false });

        pickPng(input);
        await vi.waitFor(() => expect(changes.length).toBeGreaterThan(0));
    });

    it('ignores a file while the surrounding form is disabled', async () => {
        const { changes, input } = renderField({ formDisabled: true });

        pickPng(input);
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        expect(changes).toHaveLength(0);
    });

    it('ignores a file when the field itself is read-only', async () => {
        const { changes, input } = renderField({ formDisabled: false, disabled: true });

        pickPng(input);
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        expect(changes).toHaveLength(0);
    });
});
