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
    ...overrides,
});

const renderFlow = (client: CounsellorOnboardingClient, token = 'raw-token') =>
    render(
        <MemoryRouter>
            <CounsellorOnboarding inviteToken={token} client={client} />
        </MemoryRouter>,
    );

/**
 * NOTE: jsdom's matchMedia stub answers `matches: false`, so these tests run
 * the MOBILE one-card-per-step flow by default (see useIsDesktopLayout docs).
 */
describe('CounsellorOnboarding', () => {
    it('walks the mobile step flow and registers with every collected value', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        // Step 1 — account: the invited email is prefilled and not editable.
        expect(await screen.findByLabelText('cards.advisorAccount.email')).toHaveValue('lena@tenant.example');
        expect(screen.getByLabelText('cards.advisorAccount.email')).toBeDisabled();
        await user.type(screen.getByLabelText('cards.advisorAccount.username'), 'lena.b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));

        // Step 2 — person: names come from the invite, read-only.
        expect(await screen.findByLabelText('cards.personalInfo.firstName')).toHaveValue('Lena');
        expect(screen.getByLabelText('cards.personalInfo.firstName')).toBeDisabled();
        await user.type(screen.getByLabelText('cards.personalInfo.position'), 'Leitung');
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));

        // Step 3 — names only: no avatar grid, no picture upload (arrives with #995).
        expect(await screen.findByLabelText('cards.avatarName.publicName')).toBeInTheDocument();
        expect(screen.queryByText('cards.avatarName.ownPicture')).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('cards.avatarName.publicName'), 'Lena');
        await user.type(screen.getByLabelText('cards.avatarName.internalName'), 'Lena B.');
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));

        // Step 4 — topics from the invite coverage; selecting one enables the submit.
        await user.click(await screen.findByRole('checkbox', { name: 'Familienberatung' }));
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));

        await waitFor(() =>
            expect(client.registerCounsellor).toHaveBeenCalledWith('raw-token', {
                account: { username: 'lena.b', password: 'SecurePass1!' },
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
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));
        await user.click(await screen.findByRole('button', { name: 'cards.actions.next' }));
        await user.click(await screen.findByRole('button', { name: 'cards.actions.next' }));

        // Topics step, but username/password/topics are missing.
        await user.click(await screen.findByRole('button', { name: 'cards.actions.next' }));

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

        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena.b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));
        await user.click(await screen.findByRole('button', { name: 'cards.actions.next' }));
        await user.click(await screen.findByRole('button', { name: 'cards.actions.next' }));
        await user.click(await screen.findByRole('checkbox', { name: 'Familienberatung' }));
        await user.click(screen.getByRole('button', { name: 'cards.actions.next' }));

        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
        expect(screen.getByText('cards.success.title')).toBeInTheDocument();
        // The notes textarea is deliberately absent — no backend channel exists (#997 design gap).
        expect(screen.queryByLabelText('cards.success.notes')).not.toBeInTheDocument();
    });
});
