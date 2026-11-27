import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../../../i18n';
import { ConsultantPictureControl } from './ConsultantPictureControl';
import { portraitBlob, portraitFile } from '../../../components/ConsultantPictureField/storyFixtures';

/** The active catalogue text, as a plain string for queries and assertions. */
const tx = (key: string) => String(i18n.t(key));

const PICTURE = '*/service/useradmin/consultants/:id/picture';

const storedPhoto = (internalOnly = true) => [
    http.get(PICTURE, () => new HttpResponse(portraitBlob(), { headers: { 'Content-Type': 'image/png' } })),
    http.get(`${PICTURE}/visibility`, () => HttpResponse.json({ internalOnly })),
];

/**
 * The photo card of the consultant create/edit form, against the real UserService routes
 * (`ConsultantPictureController`), mocked with MSW.
 */
const meta = {
    title: 'Pages/Users/ConsultantPictureControl',
    component: ConsultantPictureControl,
    args: { consultantId: 'c-42', disabled: false },
    parameters: { layout: 'padded' },
    render: (args) => (
        <div style={{ maxWidth: 420 }}>
            <ConsultantPictureControl {...args} />
        </div>
    ),
} satisfies Meta<typeof ConsultantPictureControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A stored photo, internal only. */
export const StoredPhoto: Story = {
    parameters: { msw: { handlers: storedPhoto() } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('img', { name: tx('counselor.picture.previewAlt') })).toBeVisible();
        await waitFor(() =>
            expect(canvas.getByRole('switch', { name: tx('cards.avatarName.ownPictureInternalOnly') })).toBeChecked(),
        );
    },
};

/** No photo stored (404). */
export const NoPhoto: Story = {
    parameters: { msw: { handlers: [http.get(PICTURE, () => new HttpResponse(null, { status: 404 }))] } },
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByText(tx('counselor.picture.empty'))).toBeVisible();
    },
};

/**
 * Today on Dev and Staging the virus scanner is off, so every upload answers 503
 * `PICTURE_SCAN_UNAVAILABLE` (ORISO-Helm#672). The admin is told exactly that, and the stored
 * photo stays.
 */
export const UploadWhileScannerIsOff: Story = {
    parameters: {
        msw: {
            handlers: [
                ...storedPhoto(),
                http.put(PICTURE, () => HttpResponse.json({ reason: 'PICTURE_SCAN_UNAVAILABLE' }, { status: 503 })),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('img');
        await userEvent.upload(canvas.getByTestId('consultant-picture-input') as HTMLInputElement, portraitFile());
        await userEvent.click(canvas.getByRole('button', { name: tx('counselor.picture.upload') }));

        await expect(await canvas.findByRole('alert')).toHaveTextContent(tx('counselor.picture.error.scanUnavailable'));
        await expect(canvas.getByRole('img', { name: tx('counselor.picture.previewAlt') })).toBeVisible();
    },
};

/** Upload accepted (204): the photo is read back and confirmed. */
export const UploadSaved: Story = {
    parameters: {
        msw: {
            handlers: [...storedPhoto(), http.put(PICTURE, () => new HttpResponse(null, { status: 204 }))],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('img');
        await userEvent.upload(canvas.getByTestId('consultant-picture-input') as HTMLInputElement, portraitFile());
        await userEvent.click(canvas.getByRole('button', { name: tx('counselor.picture.upload') }));

        await expect(await canvas.findByText(tx('counselor.picture.status.saved'))).toBeVisible();
    },
};

/** A new consultant: the photo is only chosen here and stored with the account. */
export const CreateMode: Story = { args: { consultantId: undefined } };
