import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, fn, userEvent, within } from 'storybook/test';
import i18n from '../../i18n';
import { ConsultantPictureField, ConsultantPictureFieldProps } from './index';
import { PORTRAIT_PNG_DATA_URL } from './storyFixtures';

/** The active catalogue text, as a plain string for queries and assertions. */
const tx = (key: string) => String(i18n.t(key));

/**
 * The consultant photo (Figma Admin.ORISO Avatar card, "Own picture" 1-34788): composes
 * `ImageUploadField`, `M3Button`, `ToggleRow` and `HintText`. Used by the consultant form
 * (stores each step at once) and the counsellor onboarding wizard (stores after registration).
 */
const meta = {
    title: 'Molecules/ConsultantPictureField',
    component: ConsultantPictureField,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34788',
        },
    },
    args: { onFileChosen: fn(), onSave: fn(), onDiscard: fn(), onRemove: fn() },
    render: (args) => (
        <div style={{ maxWidth: 420 }}>
            <ConsultantPictureField {...args} />
        </div>
    ),
} satisfies Meta<typeof ConsultantPictureField>;

export default meta;
type Story = StoryObj<typeof meta>;

const internal = { internalOnly: true, onChange: fn() };

/** No photo stored yet. */
export const Empty: Story = { args: { empty: true } };

/** The stored photo is still being read; "no photo" is not claimed. */
export const Loading: Story = { args: { loading: true } };

/** A stored photo, internal only (the default). */
export const StoredInternal: Story = { args: { previewSrc: PORTRAIT_PNG_DATA_URL, visibility: internal } };

/** A stored photo that advice seekers see. */
export const StoredPublic: Story = {
    args: { previewSrc: PORTRAIT_PNG_DATA_URL, visibility: { internalOnly: false, onChange: fn() } },
};

/** A replacement for a published photo is chosen: the field says it will start internal again. */
export const PendingReplacement: Story = {
    args: {
        previewSrc: PORTRAIT_PNG_DATA_URL,
        hasPendingFile: true,
        visibility: { internalOnly: false, onChange: fn() },
        note: tx('counselor.picture.selected'),
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText(tx('counselor.picture.visibility.resetHint'), { exact: false })).toBeVisible();
        await expect(canvas.getByRole('button', { name: tx('counselor.picture.upload') })).toBeEnabled();
    },
};

/** Saving: every picture action is locked, the save button shows progress. */
export const Saving: Story = {
    args: {
        previewSrc: PORTRAIT_PNG_DATA_URL,
        hasPendingFile: true,
        busy: 'upload',
        visibility: internal,
        feedback: { tone: 'status', text: tx('counselor.picture.status.uploading') },
    },
};

/**
 * The server answered 503 `PICTURE_SCAN_UNAVAILABLE`: the virus scanner is off (ORISO-Helm#672).
 * The message names the cause, so nobody retries a "broken" photo.
 */
export const ScanUnavailable: Story = {
    args: {
        previewSrc: PORTRAIT_PNG_DATA_URL,
        visibility: internal,
        feedback: { tone: 'error', text: tx('counselor.picture.error.scanUnavailable') },
    },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
            tx('counselor.picture.error.scanUnavailable'),
        );
    },
};

/** The photo could not be read: an error, never "no photo stored". */
export const ReadFailed: Story = {
    args: { disabled: true, feedback: { tone: 'error', text: tx('counselor.picture.error.readFailed') } },
};

/** Read-only form or a person pending deletion. */
export const ReadOnly: Story = {
    args: {
        previewSrc: PORTRAIT_PNG_DATA_URL,
        disabled: true,
        visibility: internal,
        note: tx('counselor.picture.deleting'),
    },
};

const Interactive = (props: Partial<ConsultantPictureFieldProps>) => {
    const [file, setFile] = useState<File | null>(null);
    return (
        <ConsultantPictureField
            {...props}
            empty={!file}
            hasPendingFile={!!file}
            previewSrc={file ? PORTRAIT_PNG_DATA_URL : undefined}
            onFileChosen={setFile}
            onDiscard={() => setFile(null)}
        />
    );
};

/** A GIF is refused in the browser, before anything is sent. */
export const RefusesUnsupportedFile: Story = {
    render: () => (
        <div style={{ maxWidth: 420 }}>
            <Interactive />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByTestId('consultant-picture-input') as HTMLInputElement;
        await userEvent.upload(input, new File(['gif'], 'a.gif', { type: 'image/gif' }), { applyAccept: false });
        await expect(canvas.getByRole('alert')).toHaveTextContent(tx('counselor.picture.error.unsupportedType'));
        await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
    },
};
