import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
    CounsellorOnboardingClient,
    CounsellorOnboardingInviteDTO,
    InviteLinkError,
} from '../../api/counsellorOnboarding/counsellorOnboarding';
import { CounsellorOnboarding } from './CounsellorOnboarding';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../../api/fetchData', async () => {
    const actual = await vi.importActual<typeof import('../../api/fetchData')>('../../api/fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

const INVITE: CounsellorOnboardingInviteDTO = {
    recipientEmail: 'lena@tenant.example',
    firstName: 'Lena',
    lastName: 'Beispiel',
    tenantId: 21,
    agencyId: 5,
    departmentId: 12,
    topics: [
        { id: 12, name: 'Familienberatung' },
        { id: 13, name: 'Schuldnerberatung' },
    ],
    expiresAt: null,
};

const createClient = (overrides: Partial<CounsellorOnboardingClient> = {}): CounsellorOnboardingClient => ({
    getOnboardingInvite: vi.fn().mockResolvedValue(INVITE),
    registerCounsellor: vi.fn().mockResolvedValue({
        consultantId: 'consultant-1',
        phase: 'PENDING_2FA_ACTIVATION',
        twoFactor: { secret: 'SECRET234567ABCDEFG', qrCodeBase64: null },
    }),
    activateTwoFactor: vi.fn().mockResolvedValue(undefined),
    uploadOnboardingPicture: vi.fn().mockResolvedValue(undefined),
    setOnboardingPictureVisibility: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

const PHOTO = () => new File(['photo-bytes'], 'me.png', { type: 'image/png' });

const renderFlow = (client: CounsellorOnboardingClient, token = 'raw-token') =>
    render(
        <MemoryRouter>
            <CounsellorOnboarding inviteToken={token} client={client} />
        </MemoryRouter>,
    );

describe('CounsellorOnboarding', () => {
    const submit = () => screen.getByRole('button', { name: 'counsellorOnboarding.submit' });

    it('renders one flat form — every group on screen, no cards, no step flow', async () => {
        renderFlow(createClient());

        expect(await screen.findByTestId('counsellor-onboarding-form')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'cards.advisorAccount.title' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'cards.personalInfo.title' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'cards.avatarName.titleNamesOnly' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'cards.focusTopics.title' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'cards.actions.next' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'cards.actions.back' })).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'counsellorOnboarding.submit' })).toHaveLength(1);
    });

    it('registers with every collected value from the single form', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        // Account: the invited email is prefilled and not editable.
        expect(await screen.findByLabelText('cards.advisorAccount.email')).toHaveValue('lena@tenant.example');
        expect(screen.getByLabelText('cards.advisorAccount.email')).toBeDisabled();
        await user.type(screen.getByLabelText('cards.advisorAccount.username'), 'lena_b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');

        // Person: names come from the invite, read-only.
        expect(screen.getByLabelText('cards.personalInfo.firstName')).toHaveValue('Lena');
        expect(screen.getByLabelText('cards.personalInfo.firstName')).toBeDisabled();
        await user.type(screen.getByLabelText('cards.personalInfo.position'), 'Leitung');

        // The avatar grid still arrives with #1046; the picture step is its own section (#1049).
        expect(screen.queryByText('cards.avatarName.ownPicture')).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('cards.avatarName.publicName'), 'Lena');
        await user.type(screen.getByLabelText('cards.avatarName.internalName'), 'Lena B.');

        // Topics from the invite coverage; selecting one enables the submit.
        expect(submit()).toBeDisabled();
        await user.click(screen.getByRole('checkbox', { name: 'Familienberatung' }));
        expect(submit()).toBeEnabled();
        await user.click(submit());

        await waitFor(() =>
            expect(client.registerCounsellor).toHaveBeenCalledWith('raw-token', {
                account: { username: 'lena_b', password: 'SecurePass1!' },
                person: { salutation: undefined, position: 'Leitung', title: undefined },
                names: { publicName: 'Lena', internalDisplayName: 'Lena B.' },
                topicIds: [12],
            }),
        );

        // The mandatory 2FA step follows the registration.
        expect(await screen.findByText('counsellorOnboarding.twoFactor.title')).toBeInTheDocument();
    });

    it('does not register while required fields are missing and shows the hint instead', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        await screen.findByLabelText('cards.advisorAccount.email');
        expect(submit()).toBeDisabled();
        // Enter on a field submits the form — the gate must hold there too.
        await user.type(screen.getByLabelText('cards.advisorAccount.username'), '{Enter}');

        expect(client.registerCounsellor).not.toHaveBeenCalled();
        expect(screen.getByTestId('wizard-submit-hint')).toBeInTheDocument();
    });

    it('applies the shared credential policy with field-specific errors before enabling submit', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        // Username with an uppercase letter and a dot — valid for nothing in
        // this product; the admin form rejects it and so must the form here.
        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'Lena.B');
        expect(screen.getByText('message.error.username.format')).toBeInTheDocument();

        // Long enough but missing upper case, digit and special character.
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'password');
        expect(screen.getByText('message.error.password.policy')).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'Familienberatung' }));
        expect(submit()).toBeDisabled();
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), '{Enter}');

        expect(client.registerCounsellor).not.toHaveBeenCalled();
        expect(screen.getByTestId('wizard-submit-hint')).toBeInTheDocument();
    });

    it('resumes a consumed-but-2FA-pending link directly at the 2FA step', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...INVITE,
                phase: 'PENDING_2FA_ACTIVATION',
                twoFactor: { secret: 'STOREDSECRET', qrCodeBase64: null },
            }),
        });
        renderFlow(client);

        expect(await screen.findByText('counsellorOnboarding.twoFactor.title')).toBeInTheDocument();
        expect(client.registerCounsellor).not.toHaveBeenCalled();
    });

    it('renders the terminal link-error state for a dead link', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockRejectedValue(new InviteLinkError('EXPIRED')),
        });
        renderFlow(client);

        expect(await screen.findByTestId('link-error-expired')).toBeInTheDocument();
    });

    it('renders a retry for transient load failures instead of a dead end', async () => {
        const failingThenOk = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(INVITE);
        const client = createClient({ getOnboardingInvite: failingThenOk });
        const user = userEvent.setup();
        renderFlow(client);

        expect(await screen.findByTestId('onboarding-load-error')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'counsellorOnboarding.loadError.retry' }));

        expect(await screen.findByTestId('counsellor-onboarding-form')).toBeInTheDocument();
    });

    it('skips the 2FA step and finishes when the invite gate was waived', async () => {
        const client = createClient({
            registerCounsellor: vi
                .fn()
                .mockResolvedValue({ consultantId: 'consultant-1', phase: 'COMPLETED', twoFactor: null }),
        });
        const user = userEvent.setup();
        renderFlow(client);

        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena_b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        await user.click(screen.getByRole('checkbox', { name: 'Familienberatung' }));
        await user.click(screen.getByRole('button', { name: 'counsellorOnboarding.submit' }));

        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
        expect(screen.getByText('cards.success.title')).toBeInTheDocument();
        // The notes textarea is deliberately absent — no backend channel exists (#997 design gap).
        expect(screen.queryByLabelText('cards.success.notes')).not.toBeInTheDocument();
    });

    describe('#1049 picture step', () => {
        const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena_b');
            await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
            await user.click(screen.getByRole('checkbox', { name: 'Familienberatung' }));
        };

        it('offers the picture step, with the publish switch hidden until a photo is chosen', async () => {
            const user = userEvent.setup();
            renderFlow(createClient());

            expect(
                await screen.findByRole('heading', { name: 'counsellorOnboarding.picture.title' }),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole('switch', { name: 'counselor.picture.visibility.label' }),
            ).not.toBeInTheDocument();

            await user.upload(screen.getByLabelText('counselor.picture.choose'), PHOTO());

            const toggle = await screen.findByRole('switch', { name: 'counselor.picture.visibility.label' });
            expect(toggle).not.toBeChecked();
            expect(screen.getByText('counselor.picture.visibility.internalHint')).toBeInTheDocument();
        });

        it('stores an internal photo after registration and never publishes it', async () => {
            const client = createClient();
            const user = userEvent.setup();
            renderFlow(client);

            await fillRequired(user);
            await user.upload(screen.getByLabelText('counselor.picture.choose'), PHOTO());
            await user.click(submit());

            await waitFor(() => expect(client.uploadOnboardingPicture).toHaveBeenCalledTimes(1));
            expect(client.setOnboardingPictureVisibility).not.toHaveBeenCalled();
            // Registration first, photo second: the account must exist before the bytes are sent.
            expect(client.registerCounsellor).toHaveBeenCalledTimes(1);
            expect(await screen.findByText('counsellorOnboarding.twoFactor.title')).toBeInTheDocument();
        });

        it('publishes the photo only when the counsellor asked for it', async () => {
            const client = createClient();
            const user = userEvent.setup();
            renderFlow(client);

            await fillRequired(user);
            await user.upload(screen.getByLabelText('counselor.picture.choose'), PHOTO());
            await user.click(screen.getByRole('switch', { name: 'counselor.picture.visibility.label' }));
            expect(screen.getByText('counselor.picture.visibility.publicHint')).toBeInTheDocument();
            await user.click(submit());

            await waitFor(() => expect(client.setOnboardingPictureVisibility).toHaveBeenCalledWith('raw-token', false));
        });

        it('sends no photo call at all when none was chosen', async () => {
            const client = createClient();
            const user = userEvent.setup();
            renderFlow(client);

            await fillRequired(user);
            await user.click(submit());

            expect(await screen.findByText('counsellorOnboarding.twoFactor.title')).toBeInTheDocument();
            expect(client.uploadOnboardingPicture).not.toHaveBeenCalled();
            expect(client.setOnboardingPictureVisibility).not.toHaveBeenCalled();
        });

        it('keeps the created account when the photo is refused, and says so', async () => {
            const client = createClient({
                uploadOnboardingPicture: vi.fn().mockRejectedValue(new Error('PICTURE_SCAN_UNAVAILABLE')),
            });
            const user = userEvent.setup();
            renderFlow(client);

            await fillRequired(user);
            await user.upload(screen.getByLabelText('counselor.picture.choose'), PHOTO());
            await user.click(submit());

            // The 2FA step still follows: a refused photo never costs the invitee their account.
            expect(await screen.findByText('counsellorOnboarding.twoFactor.title')).toBeInTheDocument();
            expect(await screen.findByTestId('wizard-picture-notice')).toHaveTextContent(
                'counsellorOnboarding.picture.uploadFailed',
            );
            expect(screen.queryByTestId('wizard-registration-error')).not.toBeInTheDocument();
        });

        it('reports a photo that was stored but could not be published', async () => {
            const client = createClient({
                setOnboardingPictureVisibility: vi.fn().mockRejectedValue(new Error('nope')),
            });
            const user = userEvent.setup();
            renderFlow(client);

            await fillRequired(user);
            await user.upload(screen.getByLabelText('counselor.picture.choose'), PHOTO());
            await user.click(screen.getByRole('switch', { name: 'counselor.picture.visibility.label' }));
            await user.click(submit());

            expect(await screen.findByTestId('wizard-picture-notice')).toHaveTextContent(
                'counsellorOnboarding.picture.visibilityFailed',
            );
        });

        it('refuses an unsupported file locally, without sending anything', async () => {
            const client = createClient();
            // applyAccept: false reproduces a browser that let a wrong type through the picker —
            // the component's own guard, not the accept attribute, must be what refuses it.
            const user = userEvent.setup({ applyAccept: false });
            renderFlow(client);

            await fillRequired(user);
            await user.upload(
                await screen.findByLabelText('counselor.picture.choose'),
                new File(['<svg/>'], 'me.svg', { type: 'image/svg+xml' }),
            );

            expect(await screen.findByRole('alert')).toHaveTextContent('counselor.picture.error.unsupportedType');
            expect(
                screen.queryByRole('switch', { name: 'counselor.picture.visibility.label' }),
            ).not.toBeInTheDocument();
            await user.click(submit());
            await waitFor(() => expect(client.registerCounsellor).toHaveBeenCalled());
            expect(client.uploadOnboardingPicture).not.toHaveBeenCalled();
        });
    });
});
