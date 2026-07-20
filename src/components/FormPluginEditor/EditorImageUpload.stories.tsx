import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { M3RichTextEditor } from './M3RichTextEditor';

// WP-3b (epic ORISO-Admin#366): image upload in the admin TipTap editor. The
// image button opens a file picker; dropping or pasting an image uploads it to
// the tenant media endpoint and inserts the served /media/{id} url.
const MEDIA_UPLOAD = '*/service/tenantadmin/media';

// 120x72 solid-red PNG so the inserted image is clearly visible without a backend.
const PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABICAYAAAA9HjF/AAAAwElEQVR4nO3RsQkAIBDAwK/dfwXn1DGEeMX1gcyedeia1wEYjMEY/CmD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjO4DiD4wyOMzjuAl4Hs8nHnWSXAAAAAElFTkSuQmCC';

const pngFile = () => {
    const bytes = Uint8Array.from(atob(PNG_DATA_URL.split(',')[1]), (c) => c.charCodeAt(0));
    return new File([bytes], 'pasted.png', { type: 'image/png' });
};

const pasteImageIntoEditor = async (canvasElement: HTMLElement) => {
    const editorEl = within(canvasElement).getByRole('textbox', { name: 'Impressum' });
    // A real DataTransfer: the browser's ClipboardEvent constructor rejects plain objects.
    const clipboardData = new DataTransfer();
    clipboardData.items.add(pngFile());
    editorEl.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
};

const ControlledEditor = (args: Parameters<typeof M3RichTextEditor>[0]) => {
    const [value, setValue] = useState(args.value ?? '');
    return <M3RichTextEditor {...args} value={value} onChange={setValue} />;
};

const meta = {
    title: 'Organisms/M3 Rich Text Editor/ImageUpload',
    component: M3RichTextEditor,
    parameters: { layout: 'centered' },
    args: {
        title: 'Impressum',
        value: '<p>Text vor dem Bild.</p>',
        onPublish: () => undefined,
        onSaveDraft: () => undefined,
    },
    render: (args) => <ControlledEditor {...args} />,
} satisfies Meta<typeof M3RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pasting an image uploads it and inserts the served /media/{id} url. */
export const UploadInserted: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post(MEDIA_UPLOAD, () =>
                    HttpResponse.json(
                        { id: 'story-media', url: PNG_DATA_URL, contentType: 'image/png' },
                        { status: 201 },
                    ),
                ),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await pasteImageIntoEditor(canvasElement);
        await waitFor(() => expect(canvasElement.querySelector('img')).toBeTruthy());
    },
};

/** Upload in flight: the toolbar image button shows its busy state. */
export const Uploading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post(MEDIA_UPLOAD, async () => {
                    await delay('infinite');
                    return HttpResponse.json({}, { status: 201 });
                }),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await pasteImageIntoEditor(canvasElement);
        await waitFor(async () => {
            expect(await canvas.findByText(/Uploading|Lädt hoch/)).toBeTruthy();
        });
    },
};

/** Backend rejects the upload (e.g. failed magic-byte check): error toast, no image. */
export const UploadError: Story = {
    parameters: {
        msw: {
            handlers: [http.post(MEDIA_UPLOAD, () => new HttpResponse(null, { status: 400 }))],
        },
    },
    play: async ({ canvasElement }) => {
        await pasteImageIntoEditor(canvasElement);
        expect(await within(document.body).findByText(/upload failed|Upload fehlgeschlagen/i)).toBeTruthy();
        expect(canvasElement.querySelector('img')).toBeFalsy();
    },
};
