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
const renderField = ({
    formDisabled,
    disabled,
    allowIcon,
}: {
    formDisabled: boolean;
    disabled?: boolean;
    allowIcon?: boolean;
}) => {
    const changes: Record<string, unknown>[] = [];

    const { container } = render(
        <Form disabled={formDisabled} onValuesChange={(changed) => changes.push(changed)}>
            <FormFileUploaderField name="logo" labelKey="organisation.logo" disabled={disabled} allowIcon={allowIcon} />
        </Form>,
    );

    // Assert the input is really there: without it the change event below would be a
    // no-op and the "nothing happened" expectations would pass for the wrong reason.
    const input = container.querySelector('.ant-upload input[type="file"]');
    expect(input).not.toBeNull();

    return { changes, input: input as HTMLInputElement };
};

const pickFile = (input: HTMLInputElement, name: string, type: string) =>
    fireEvent.change(input, { target: { files: [new File(['x'], name, { type })] } });

const pickPng = (input: HTMLInputElement) => pickFile(input, 'logo.png', 'image/png');

const settle = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 50);
    });

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
        await settle();

        expect(changes).toHaveLength(0);
    });

    /**
     * The card offers ICO for the favicon, so an .ico file has to get through
     * whichever MIME type the host reports for it — including none at all.
     */
    describe('ICO for the favicon', () => {
        it.each([
            ['Chrome', 'image/vnd.microsoft.icon'],
            ['Firefox', 'image/x-icon'],
            ['a host with no mapping for the extension', ''],
        ])('accepts an .ico file reported by %s', async (_host, type) => {
            const { changes, input } = renderField({ formDisabled: false, allowIcon: true });

            pickFile(input, 'favicon.ico', type);
            await vi.waitFor(() => expect(changes.length).toBeGreaterThan(0));
        });

        it('still rejects an .ico file on a field that does not allow icons', async () => {
            const { changes, input } = renderField({ formDisabled: false });

            pickFile(input, 'favicon.ico', 'image/vnd.microsoft.icon');
            await settle();

            expect(changes).toHaveLength(0);
        });

        it('rejects an unrelated file type even when icons are allowed', async () => {
            const { changes, input } = renderField({ formDisabled: false, allowIcon: true });

            pickFile(input, 'notes.txt', 'text/plain');
            await settle();

            expect(changes).toHaveLength(0);
        });
    });

    it('offers only the accepted formats in the file picker', () => {
        const withIcon = renderField({ formDisabled: false, allowIcon: true });
        expect(withIcon.input.accept).toContain('.ico');

        const withoutIcon = renderField({ formDisabled: false });
        expect(withoutIcon.input.accept).not.toContain('.ico');
        expect(withoutIcon.input.accept).toContain('.png');
    });
});
