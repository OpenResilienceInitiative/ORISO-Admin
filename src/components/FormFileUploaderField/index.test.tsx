import { Form, message } from 'antd';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { assistantIconUploadPolicy } from '../../utils/assistantIconUploadPolicy';
import { FormFileUploaderField } from './index';
import { getSafeFaviconUrl } from '../../utils/getSafeFaviconUrl';

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
    allowAssistantIcon,
    value,
}: {
    formDisabled: boolean;
    disabled?: boolean;
    allowIcon?: boolean;
    allowAssistantIcon?: boolean;
    value?: string;
}) => {
    const changes: Record<string, unknown>[] = [];

    const { container } = render(
        <Form
            initialValues={{ logo: value }}
            disabled={formDisabled}
            onValuesChange={(changed) => changes.push(changed)}
        >
            <FormFileUploaderField
                name="logo"
                labelKey="organisation.logo"
                disabled={disabled}
                allowIcon={allowIcon}
                uploadPolicy={allowAssistantIcon ? assistantIconUploadPolicy : undefined}
            />
        </Form>,
    );

    // Assert the input is really there: without it the change event below would be a
    // no-op and the "nothing happened" expectations would pass for the wrong reason.
    const input = container.querySelector('.ant-upload input[type="file"]');
    expect(input).not.toBeNull();

    return { container, changes, input: input as HTMLInputElement };
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

        /**
         * Accepting the file is only half the job: the value the uploader stores is
         * what later becomes `link[rel=icon][href]`, and `getSafeFaviconUrl` only
         * admits `data:image/*`. A host that reports no MIME type for `.ico` made
         * FileReader label the payload `application/octet-stream`, so the upload
         * looked successful while the tab kept the built-in favicon.
         */
        it.each([
            ['Chrome', 'image/vnd.microsoft.icon'],
            ['Firefox', 'image/x-icon'],
            ['a host with no mapping for the extension', ''],
        ])('stores an .ico from %s as a value the favicon gatekeeper accepts', async (_host, type) => {
            const { changes, input } = renderField({ formDisabled: false, allowIcon: true });

            pickFile(input, 'favicon.ico', type);
            await vi.waitFor(() => expect(changes.length).toBeGreaterThan(0));

            const stored = changes[0].logo as string;
            expect(stored).toMatch(/^data:image\//);
            expect(getSafeFaviconUrl(stored)).toBe(stored);
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

describe('assistant SVG upload through the Appearance form', () => {
    it('stores passive SVG artwork in the form and rejects active SVG artwork', async () => {
        const { changes, input } = renderField({ formDisabled: false, allowAssistantIcon: true });
        fireEvent.change(input, {
            target: {
                files: [
                    new File(
                        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>'],
                        'robot.svg',
                        { type: 'image/svg+xml' },
                    ),
                ],
            },
        });
        await vi.waitFor(() => expect(changes).toHaveLength(1));
        expect(String(changes[0].logo)).toMatch(/^data:image\/svg\+xml;base64,/);
        fireEvent.change(input, {
            target: {
                files: [
                    new File(
                        ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
                        'unsafe.svg',
                        { type: 'image/svg+xml' },
                    ),
                ],
            },
        });
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(changes).toHaveLength(1);
    });
});

describe('assistant preset and uploaded previews', () => {
    it.each(['default', 'robot-7341990', 'robot-1184077', 'robot-3548536', 'robot-5475944'])(
        'offers upload without making a relative image request for %s',
        (value) => {
            const { container } = renderField({ formDisabled: false, allowAssistantIcon: true, value });
            expect(container.querySelector('.ant-upload img')).toBeNull();
            expect(container.querySelector('.ant-upload')).toHaveTextContent('btn.upload');
        },
    );
    it.each(['data:image/png;base64,iVBORw0KGgo=', 'data:image/svg+xml;base64,PHN2Zy8+'])(
        'previews an uploaded image %s',
        (value) => {
            const { container } = renderField({ formDisabled: false, allowAssistantIcon: true, value });
            expect(container.querySelector('.ant-upload img')).toHaveAttribute('src', value);
        },
    );
    it('preserves the existing ordinary branding URL preview', () => {
        const value = 'https://example.test/logo.png';
        const { container } = renderField({ formDisabled: false, value });
        expect(container.querySelector('.ant-upload img')).toHaveAttribute('src', value);
    });
});

describe('assistant namespace validation', () => {
    it.each([
        '<svg xmlns="urn:foreign"><path/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><path xmlns="urn:foreign"/></svg>',
    ])('rejects foreign artwork %s', async (source) => {
        const { changes, input } = renderField({ formDisabled: false, allowAssistantIcon: true });
        fireEvent.change(input, { target: { files: [new File([source], 'foreign.svg', { type: 'image/svg+xml' })] } });
        await settle();
        expect(changes).toHaveLength(0);
    });
});

describe('assistant read failure feedback', () => {
    it.each(['error', 'abort'])('shows an error for a FileReader %s without changing the form', async (event) => {
        const feedback = vi.spyOn(message, 'error').mockImplementation(() => undefined);
        const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function failRead() {
            this.dispatchEvent(new Event(event));
        });
        try {
            const { changes, input } = renderField({ formDisabled: false, allowAssistantIcon: true });
            pickFile(input, 'robot.svg', 'image/svg+xml');
            await vi.waitFor(() => expect(feedback).toHaveBeenCalledOnce());
            expect(changes).toHaveLength(0);
        } finally {
            read.mockRestore();
            feedback.mockRestore();
        }
    });
});
