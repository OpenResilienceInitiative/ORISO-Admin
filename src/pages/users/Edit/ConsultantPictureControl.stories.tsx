import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18next from 'i18next';
import { ConsultantPictureControl, ConsultantPictureControlProps } from './ConsultantPictureControl';

const pictureRoute = '*/service/useradmin/consultants/:consultantId/picture';
const visibilityRoute = `${pictureRoute}/visibility`;
// Complete 16x16 RGB PNG, including image data and valid chunk CRCs.
const png = Uint8Array.from(
    atob(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGNIaFhAEmIY1TCqYfhqAADldYAQcPKLcQAAAABJRU5ErkJggg==',
    ),
    (character) => character.charCodeAt(0),
);
const loaded = () => new HttpResponse(png.slice(), { headers: { 'Content-Type': 'image/png' } });
const missing = () => new HttpResponse(null, { status: 404 });
const refuse = (reason: string, status: number) => () => HttpResponse.json({ reason }, { status });
const pending = async () => {
    await delay('infinite');
    return new HttpResponse(null, { status: 204 });
};
// Issue #1049: the publish switch is a sub-resource of the picture, mocked alongside it. The
// visibility handler keeps its own state so publish-then-withdraw reads back what was written.
const visibilityHandlers = (initial = true, put = () => new HttpResponse(null, { status: 204 })) => {
    let internalOnly = initial;
    return [
        http.get(visibilityRoute, () => HttpResponse.json({ internalOnly })),
        http.put(visibilityRoute, async (info) => {
            const response = await put();
            if (response.status === 204) internalOnly = (await info.request.json()).internalOnly;
            return response;
        }),
    ];
};
const handlers = (
    get = loaded,
    put = () => new HttpResponse(null, { status: 204 }),
    visibility = visibilityHandlers(),
) => [
    http.get(pictureRoute, get),
    http.put(pictureRoute, put),
    http.delete(pictureRoute, () => new HttpResponse(null, { status: 204 })),
    ...visibility,
];

const PictureStory = (args: ConsultantPictureControlProps) => {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    useEffect(() => () => client.clear(), [client]);
    return (
        <QueryClientProvider client={client}>
            <div style={{ maxWidth: 420 }}>
                <ConsultantPictureControl {...args} />
            </div>
        </QueryClientProvider>
    );
};
const label = (key: string) => i18next.t(`counselor.picture.${key}`);
const decodedPreview = async (canvasElement: HTMLElement) => {
    const img = (await within(canvasElement).findByRole('img')) as HTMLImageElement;
    await waitFor(() => {
        expect(img.naturalWidth).toBe(16);
        expect(img.naturalHeight).toBe(16);
    });
};
const selectAndUpload = async (canvasElement: HTMLElement) => {
    const canvas = within(canvasElement);
    await userEvent.upload(
        canvas.getByLabelText(label('choose')),
        new File([png], 'portrait.png', { type: 'image/png' }),
    );
    await decodedPreview(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: label('upload') }));
};

const meta = {
    title: 'Users/Edit/ConsultantPictureControl',
    component: ConsultantPictureControl,
    parameters: {
        layout: 'padded',
        a11y: { test: 'error', options: { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } },
    },
    args: { consultantId: '42', disabled: false, pendingDeletion: false },
    // Separate QueryClients prevent a previous story's cached bytes or pending work leaking in.
    render: (args, context) => <PictureStory key={context.id} {...args} />,
} satisfies Meta<typeof ConsultantPictureControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    parameters: { msw: { handlers: handlers(missing) } },
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByText(label('empty'))).toBeVisible();
        await expect(within(canvasElement).queryByRole('img')).not.toBeInTheDocument();
    },
};
export const Loaded: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
    },
};
export const Pending: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(pictureRoute, loaded),
                http.put(pictureRoute, pending),
                http.delete(pictureRoute, missing),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        await selectAndUpload(canvasElement);
        const canvas = within(canvasElement);
        await expect(await canvas.findByText(label('status.uploading'))).toBeVisible();
        await expect(canvas.getByRole('button', { name: label('choose') })).toBeDisabled();
        await expect(canvas.getByLabelText(label('choose'))).toBeDisabled();
    },
};
export const Rejected: Story = {
    parameters: { msw: { handlers: handlers(loaded, refuse('PICTURE_REJECTED', 422)) } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        await selectAndUpload(canvasElement);
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('alert')).toHaveTextContent(label('error.rejected'));
        await decodedPreview(canvasElement);
        await expect(canvas.getByRole('button', { name: label('choose') })).toHaveFocus();
    },
};
export const ScannerUnavailable: Story = {
    parameters: { msw: { handlers: handlers(loaded, refuse('PICTURE_SCAN_UNAVAILABLE', 503)) } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        await selectAndUpload(canvasElement);
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('alert')).toHaveTextContent(label('error.unavailable'));
        await decodedPreview(canvasElement);
        await expect(canvas.getByRole('button', { name: label('choose') })).toHaveFocus();
    },
};
export const ReadOnly: Story = {
    args: { disabled: true },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        await expect(within(canvasElement).getByRole('button', { name: label('choose') })).toBeDisabled();
        await expect(within(canvasElement).getByRole('button', { name: label('remove') })).toBeDisabled();
    },
};
export const Deleting: Story = {
    args: { pendingDeletion: true },
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('status')).toHaveTextContent(label('deleting'));
        await expect(canvas.getByRole('button', { name: label('choose') })).toBeDisabled();
        await expect(canvas.getByRole('button', { name: label('remove') })).toBeDisabled();
    },
};
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.get(pictureRoute, pending),
                http.put(pictureRoute, missing),
                http.delete(pictureRoute, missing),
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('status')).toHaveTextContent(label('loading'));
        await expect(canvas.queryByText(label('empty'))).not.toBeInTheDocument();
    },
};
export const Forbidden: Story = {
    parameters: { msw: { handlers: handlers(() => new HttpResponse(null, { status: 403 })) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('alert')).toHaveTextContent(label('error.forbidden'));
        await expect(canvas.queryByText(label('empty'))).not.toBeInTheDocument();
    },
};
export const ReadError: Story = {
    parameters: { msw: { handlers: handlers(() => new HttpResponse(null, { status: 503 })) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByRole('alert')).toHaveTextContent(label('error.readFailed'));
        await expect(canvas.queryByText(label('empty'))).not.toBeInTheDocument();
        await expect(canvas.queryByText(label('error.unavailable'))).not.toBeInTheDocument();
    },
};

const visibilitySwitch = (canvasElement: HTMLElement) =>
    within(canvasElement).findByRole('switch', { name: i18next.t('counselor.picture.visibility.label') });

export const InternalOnlyByDefault: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        const toggle = await visibilitySwitch(canvasElement);
        await waitFor(() => expect(toggle).toBeEnabled());
        await expect(toggle).not.toBeChecked();
        await expect(
            within(canvasElement).getByText(i18next.t('counselor.picture.visibility.internalHint')),
        ).toBeVisible();
    },
};

export const PublishedToAdviceSeekers: Story = {
    parameters: { msw: { handlers: handlers(loaded, undefined, visibilityHandlers(false)) } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        const toggle = await visibilitySwitch(canvasElement);
        await waitFor(() => expect(toggle).toBeChecked());
        await expect(
            within(canvasElement).getByText(i18next.t('counselor.picture.visibility.publicHint')),
        ).toBeVisible();
    },
};

export const PublishThenWithdraw: Story = {
    parameters: { msw: { handlers: handlers() } },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        const toggle = await visibilitySwitch(canvasElement);
        await waitFor(() => expect(toggle).toBeEnabled());

        await userEvent.click(toggle);
        await expect(
            await within(canvasElement).findByText(i18next.t('counselor.picture.status.published')),
        ).toBeVisible();
        await waitFor(() => expect(toggle).toBeChecked());

        await userEvent.click(toggle);
        await expect(
            await within(canvasElement).findByText(i18next.t('counselor.picture.status.withdrawn')),
        ).toBeVisible();
        // Withdrawal is immediate: the re-read flag, not optimistic local state, drives the switch.
        await waitFor(() => expect(toggle).not.toBeChecked());
    },
};

export const RefusedVisibilityChange: Story = {
    parameters: {
        msw: {
            handlers: handlers(
                loaded,
                undefined,
                visibilityHandlers(true, () => new HttpResponse(null, { status: 503 })),
            ),
        },
    },
    play: async ({ canvasElement }) => {
        await decodedPreview(canvasElement);
        const toggle = await visibilitySwitch(canvasElement);
        await waitFor(() => expect(toggle).toBeEnabled());
        await userEvent.click(toggle);
        await expect(
            await within(canvasElement).findByText(i18next.t('counselor.picture.error.visibilityFailed')),
        ).toBeVisible();
        await waitFor(() => expect(toggle).not.toBeChecked());
    },
};

export const NoSwitchWithoutAPicture: Story = {
    parameters: { msw: { handlers: handlers(missing) } },
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByText(label('empty'))).toBeVisible();
        await expect(
            within(canvasElement).queryByRole('switch', { name: i18next.t('counselor.picture.visibility.label') }),
        ).not.toBeInTheDocument();
    },
};
