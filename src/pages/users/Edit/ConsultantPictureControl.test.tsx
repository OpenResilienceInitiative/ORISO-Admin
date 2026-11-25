import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../../../i18n';
import * as api from '../../../api/counselor/consultantPicture';
import { ConsultantPictureControl } from './ConsultantPictureControl';

vi.mock('../../../api/counselor/consultantPicture', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../api/counselor/consultantPicture')>();
    return {
        ...actual,
        getConsultantPicture: vi.fn(),
        getConsultantPictureVisibility: vi.fn(),
        uploadConsultantPicture: vi.fn(),
        removeConsultantPicture: vi.fn(),
        setConsultantPictureVisibility: vi.fn(),
    };
});

const stored = new Blob(['stored'], { type: 'image/png' });
const png = () => new File(['new-photo'], 'portrait.png', { type: 'image/png' });
const refused = (status: number, reason: string) =>
    new Response(JSON.stringify({ reason }), { status, headers: { 'Content-Type': 'application/json' } });

const renderControl = (props: Partial<Parameters<typeof ConsultantPictureControl>[0]> = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ConsultantPictureControl consultantId="c-42" disabled={false} {...props} />
        </QueryClientProvider>,
    );
};

const chooseFile = async (user: ReturnType<typeof userEvent.setup>, file: File) =>
    user.upload(screen.getByTestId('consultant-picture-input') as HTMLInputElement, file);

describe('ConsultantPictureControl', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('en');
        URL.createObjectURL = vi.fn(() => 'blob:preview');
        URL.revokeObjectURL = vi.fn();
        vi.mocked(api.getConsultantPicture).mockResolvedValue(stored);
        vi.mocked(api.getConsultantPictureVisibility).mockResolvedValue(true);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('shows the stored photo with the switch on "internal only" by default', async () => {
        renderControl();

        expect(await screen.findByRole('img', { name: 'Photo of this counsellor' })).toBeInTheDocument();
        const internalOnly = await screen.findByRole('switch', { name: 'Own picture visible internally only' });
        await waitFor(() => expect(internalOnly).toBeChecked());
        expect(screen.getByRole('button', { name: /Choose a different photo/ })).toBeEnabled();
    });

    it('stores a chosen photo for this consultant and returns focus to the choose button', async () => {
        const user = userEvent.setup();
        vi.mocked(api.uploadConsultantPicture).mockResolvedValue(new Response(null, { status: 204 }));
        renderControl();
        await screen.findByRole('img');

        const file = png();
        await chooseFile(user, file);
        await user.click(screen.getByRole('button', { name: 'Save photo' }));

        expect(api.uploadConsultantPicture).toHaveBeenCalledWith('c-42', file);
        expect((await screen.findByText('Photo saved.')).closest('[role="status"]')).not.toBeNull();
        await waitFor(() => expect(screen.getByRole('button', { name: /Choose a different photo/ })).toHaveFocus());
        // Read back after the write: the UI shows what the server holds.
        await waitFor(() => expect(api.getConsultantPicture).toHaveBeenCalledTimes(2));
    });

    it('says plainly that the virus check is unavailable when the server answers 503', async () => {
        const user = userEvent.setup();
        vi.mocked(api.uploadConsultantPicture).mockRejectedValue(refused(503, 'PICTURE_SCAN_UNAVAILABLE'));
        renderControl();
        await screen.findByRole('img');

        await chooseFile(user, png());
        await user.click(screen.getByRole('button', { name: 'Save photo' }));

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('the virus check for photos is not available');
        expect(alert).toHaveTextContent('Nothing is wrong with your photo');
        // The refused file is dropped; the stored photo stays and the same file can be chosen again.
        expect(screen.queryByRole('button', { name: 'Save photo' })).not.toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Photo of this counsellor' })).toBeInTheDocument();
    });

    it('refuses a GIF before any upload', async () => {
        const user = userEvent.setup({ applyAccept: false });
        renderControl();
        await screen.findByRole('img');

        await chooseFile(user, new File(['gif'], 'a.gif', { type: 'image/gif' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Please choose a PNG or JPEG photo.');
        expect(screen.queryByRole('button', { name: 'Save photo' })).not.toBeInTheDocument();
        expect(api.uploadConsultantPicture).not.toHaveBeenCalled();
    });

    it('publishes the photo to advice seekers by switching "internal only" off', async () => {
        const user = userEvent.setup();
        vi.mocked(api.setConsultantPictureVisibility).mockResolvedValue(new Response(null, { status: 204 }));
        renderControl();
        const internalOnly = await screen.findByRole('switch', { name: 'Own picture visible internally only' });
        await waitFor(() => expect(internalOnly).toBeEnabled());

        await user.click(internalOnly);

        expect(api.setConsultantPictureVisibility).toHaveBeenCalledWith('c-42', false);
        expect(await screen.findByText('Advice seekers can now see this photo.')).toBeInTheDocument();
    });

    it('removes the stored photo', async () => {
        const user = userEvent.setup();
        vi.mocked(api.removeConsultantPicture).mockResolvedValue(new Response(null, { status: 204 }));
        renderControl();
        await screen.findByRole('img');
        vi.mocked(api.getConsultantPicture).mockResolvedValue(null);

        await user.click(screen.getByRole('button', { name: 'Remove photo' }));

        expect(api.removeConsultantPicture).toHaveBeenCalledWith('c-42');
        expect(await screen.findByText('Photo removed.')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument());
        expect(screen.getByText('No photo stored yet.')).toBeInTheDocument();
    });

    it('never claims "no photo" when the read failed', async () => {
        vi.mocked(api.getConsultantPicture).mockRejectedValue(new Error('CATCH_ALL'));
        renderControl();

        expect(await screen.findByRole('alert')).toHaveTextContent('The photo could not be loaded.');
        expect(screen.queryByText('No photo stored yet.')).not.toBeInTheDocument();
    });

    it('hands the chosen file to the form while a consultant is being created', async () => {
        const user = userEvent.setup();
        const onSelectedFileChange = vi.fn();
        renderControl({ consultantId: undefined, onSelectedFileChange });

        const file = png();
        await chooseFile(user, file);

        expect(onSelectedFileChange).toHaveBeenCalledWith(file);
        expect(screen.getByText('The photo is stored together with the new account.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save photo' })).not.toBeInTheDocument();
        expect(api.getConsultantPicture).not.toHaveBeenCalled();
    });

    it('locks every photo action while the form is read-only', async () => {
        renderControl({ disabled: true });
        await screen.findByRole('img');

        expect(screen.getByRole('button', { name: /Choose a different photo/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove photo' })).toBeDisabled();
    });
});
