import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    availableTopics: [
        { id: 12, name: 'Familienberatung' },
        { id: 13, name: 'Schuldnerberatung' },
        { id: 14, name: 'Suchtberatung' },
    ],
    expiresAt: null,
};

/** Opens the "+" menu and adds one topic. */
const addTopic = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(screen.getByRole('button', { name: 'counsellorOnboarding.topics.add' }));
    await user.click(await screen.findByRole('menuitem', { name }));
};

/** Removes a selected topic chip via its trailing x. */
const removeTopic = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    const chip = screen.getByText(name).closest('[data-testid="input-chip"]')!;
    await user.click(within(chip).getByRole('button'));
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

        // Names only: no avatar grid, no picture upload (arrives with #995).
        expect(screen.queryByText('cards.avatarName.ownPicture')).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('cards.avatarName.publicName'), 'Lena');
        await user.type(screen.getByLabelText('cards.avatarName.internalName'), 'Lena B.');

        // The coverage arrives preselected as chips; one is removed via its x,
        // a further tenant topic is added via the "+" menu.
        expect(screen.getAllByTestId('input-chip')).toHaveLength(2);
        expect(submit()).toBeEnabled();
        await removeTopic(user, 'Schuldnerberatung');
        await addTopic(user, 'Suchtberatung');
        await user.click(submit());

        await waitFor(() =>
            expect(client.registerCounsellor).toHaveBeenCalledWith('raw-token', {
                account: { username: 'lena_b', password: 'SecurePass1!' },
                person: { salutation: undefined, position: 'Leitung', title: undefined },
                names: { publicName: 'Lena', internalDisplayName: 'Lena B.' },
                topicIds: [12, 14],
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

        expect(submit()).toBeDisabled();
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), '{Enter}');

        expect(client.registerCounsellor).not.toHaveBeenCalled();
        expect(screen.getByTestId('wizard-submit-hint')).toBeInTheDocument();
    });

    it('offers the tenant topics and asks for the agency name when the invite creates a new agency', async () => {
        // Reserved (AUTO) Beratungsstellen-ID: the agency does not exist yet, so
        // there is no coverage — the invitee names the agency and picks its
        // topics from the tenant's active topics instead of being stuck.
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...INVITE,
                agencyId: 13,
                departmentId: null,
                agencyExists: false,
                topics: [],
                availableTopics: [
                    { id: 21, name: 'Familienberatung' },
                    { id: 22, name: 'Suchtberatung' },
                ],
            }),
        });
        const user = userEvent.setup();
        renderFlow(client);

        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena_b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        expect(screen.getByRole('heading', { name: 'counsellorOnboarding.agency.title' })).toBeInTheDocument();
        expect(screen.getByText('counsellorOnboarding.topics.chooseHint')).toBeInTheDocument();

        // Nothing is preselected without coverage; topics alone do not unlock
        // the submit — the new agency needs a name.
        expect(screen.queryByTestId('input-chip')).not.toBeInTheDocument();
        await addTopic(user, 'Suchtberatung');
        expect(submit()).toBeDisabled();
        await user.type(screen.getByLabelText('counsellorOnboarding.agency.name'), 'Beratungsstelle Nord');
        expect(submit()).toBeEnabled();
        await user.click(submit());

        await waitFor(() =>
            expect(client.registerCounsellor).toHaveBeenCalledWith('raw-token', {
                account: { username: 'lena_b', password: 'SecurePass1!' },
                person: { salutation: undefined, position: undefined, title: undefined },
                names: { publicName: undefined, internalDisplayName: undefined },
                topicIds: [22],
                agency: { name: 'Beratungsstelle Nord' },
            }),
        );
    });

    it('explains an invite without any selectable topic instead of a silently dead submit', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...INVITE,
                departmentId: null,
                agencyExists: true,
                topics: [],
                availableTopics: [],
            }),
        });
        renderFlow(client);

        expect(await screen.findByRole('alert')).toHaveTextContent('counsellorOnboarding.topics.none');
        expect(screen.queryByRole('button', { name: 'counsellorOnboarding.topics.add' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'counsellorOnboarding.agency.title' })).not.toBeInTheDocument();
        expect(submit()).toBeDisabled();
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
        // Coverage is preselected — nothing else to pick.
        await user.click(screen.getByRole('button', { name: 'counsellorOnboarding.submit' }));

        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
        expect(screen.getByText('cards.success.title')).toBeInTheDocument();
        // The notes textarea is deliberately absent — no backend channel exists (#997 design gap).
        expect(screen.queryByLabelText('cards.success.notes')).not.toBeInTheDocument();
    });
});
