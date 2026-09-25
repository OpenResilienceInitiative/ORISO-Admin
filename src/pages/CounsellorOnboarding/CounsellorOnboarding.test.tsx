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
        expect(screen.getByRole('heading', { name: 'cards.avatarName.title' })).toBeInTheDocument();
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

        // Avatar step is on (#1047); only the own-picture upload is still missing (#1049).
        expect(screen.queryByText('cards.avatarName.ownPicture')).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('cards.avatarName.publicName'), 'Lena');
        // The initials tile mirrors the public display name as it is typed.
        await user.click(screen.getByRole('radio', { name: 'counselor.avatar.initials' }));
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
                avatar: { kind: 'INITIALS' },
                topicIds: [12, 14],
            }),
        );

        // The mandatory 2FA step follows the registration.
        expect(await screen.findByText('counsellorOnboarding.twoFactor.title')).toBeInTheDocument();
    });

    it('sends the chosen motif, and no avatar block at all when nothing was picked', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena_b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        // t is mocked to the raw key, so every motif tile shares one label — take the first.
        await user.click(screen.getAllByRole('radio', { name: 'counselor.avatar.motif' })[0]);
        await user.click(submit());

        await waitFor(() =>
            expect(client.registerCounsellor).toHaveBeenCalledWith(
                'raw-token',
                expect.objectContaining({ avatar: { kind: 'ICON', id: expect.any(String) } }),
            ),
        );
    });

    it('omits the avatar entirely when the invitee picks nothing', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena_b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        await user.click(submit());

        await waitFor(() => expect(client.registerCounsellor).toHaveBeenCalled());
        const [, request] = (client.registerCounsellor as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(request).not.toHaveProperty('avatar');
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

    describe('topic permission', () => {
        const fillAccount = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'lena_b');
            await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
        };
        const topicChip = (name: string) => screen.getByRole('checkbox', { name });
        const registeredTopics = (client: CounsellorOnboardingClient) =>
            vi.mocked(client.registerCounsellor).mock.calls[0][1].topicIds;

        it('CREATE keeps the "+" to add further topics of the Träger', async () => {
            renderFlow(
                createClient({
                    getOnboardingInvite: vi.fn().mockResolvedValue({ ...INVITE, topicPermission: 'CREATE' }),
                }),
            );

            expect(await screen.findByRole('button', { name: 'counsellorOnboarding.topics.add' })).toBeInTheDocument();
        });

        it('SELECT_EXISTING offers only the agency topics as toggles — no "+"', async () => {
            const client = createClient({
                getOnboardingInvite: vi.fn().mockResolvedValue({
                    ...INVITE,
                    topicPermission: 'SELECT_EXISTING',
                    availableTopics: [],
                }),
            });
            const user = userEvent.setup();
            renderFlow(client);
            await fillAccount(user);

            expect(screen.queryByRole('button', { name: 'counsellorOnboarding.topics.add' })).not.toBeInTheDocument();
            expect(screen.getByText('counsellorOnboarding.topics.selectExistingHint')).toBeInTheDocument();
            // The assigned department arrives selected; a further agency topic is added by toggling.
            expect(topicChip('Familienberatung')).toBeChecked();
            expect(topicChip('Schuldnerberatung')).not.toBeChecked();
            await user.click(topicChip('Schuldnerberatung'));

            // At least one topic: deselecting everything disables the submit.
            await user.click(topicChip('Familienberatung'));
            await user.click(topicChip('Schuldnerberatung'));
            expect(submit()).toBeDisabled();

            await user.click(topicChip('Schuldnerberatung'));
            await user.click(submit());
            await waitFor(() => expect(registeredTopics(client)).toEqual([13]));
        });

        it('NONE with an assigned department shows it fixed', async () => {
            const client = createClient({
                getOnboardingInvite: vi.fn().mockResolvedValue({
                    ...INVITE,
                    topicPermission: 'NONE',
                    topics: [{ id: 12, name: 'Familienberatung' }],
                    availableTopics: [],
                }),
            });
            const user = userEvent.setup();
            renderFlow(client);
            await fillAccount(user);

            expect(screen.queryByRole('button', { name: 'counsellorOnboarding.topics.add' })).not.toBeInTheDocument();
            expect(screen.getByText('counsellorOnboarding.topics.fixedHint')).toBeInTheDocument();
            expect(topicChip('Familienberatung')).toBeChecked();
            expect(topicChip('Familienberatung')).toBeDisabled();

            await user.click(submit());
            await waitFor(() => expect(registeredTopics(client)).toEqual([12]));
        });

        it('NONE without an assigned department lets the person pick exactly one agency topic', async () => {
            const client = createClient({
                getOnboardingInvite: vi.fn().mockResolvedValue({
                    ...INVITE,
                    departmentId: null,
                    topicPermission: 'NONE',
                    availableTopics: [],
                }),
            });
            const user = userEvent.setup();
            renderFlow(client);
            await fillAccount(user);

            expect(screen.getByText('counsellorOnboarding.topics.pickOneHint')).toBeInTheDocument();
            expect(topicChip('Familienberatung')).not.toBeChecked();
            expect(submit()).toBeDisabled();

            await user.click(topicChip('Familienberatung'));
            await user.click(topicChip('Schuldnerberatung'));
            expect(topicChip('Familienberatung')).not.toBeChecked();
            expect(topicChip('Schuldnerberatung')).toBeChecked();

            await user.click(submit());
            await waitFor(() => expect(registeredTopics(client)).toEqual([13]));
        });

        it('a single agency topic is preselected and fixed without the "+"', async () => {
            renderFlow(
                createClient({
                    getOnboardingInvite: vi.fn().mockResolvedValue({
                        ...INVITE,
                        departmentId: null,
                        topicPermission: 'SELECT_EXISTING',
                        topics: [{ id: 13, name: 'Schuldnerberatung' }],
                        availableTopics: [],
                    }),
                }),
            );

            const chip = await screen.findByRole('checkbox', { name: 'Schuldnerberatung' });
            expect(chip).toBeChecked();
            expect(chip).toBeDisabled();
            expect(screen.queryByRole('button', { name: 'counsellorOnboarding.topics.add' })).not.toBeInTheDocument();
        });
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

describe('CounsellorOnboarding — agency admin, "Berät auch"', () => {
    const AGENCY_ADMIN_INVITE: CounsellorOnboardingInviteDTO = {
        ...INVITE,
        targetRole: 'AGENCY_ADMIN',
        alsoCounsellor: true,
        topicPermission: 'CREATE',
    };
    const submit = () => screen.getByRole('button', { name: 'counsellorOnboarding.submit' });
    const alsoCounsellorSwitch = () =>
        screen.getByRole('switch', { name: 'counsellorOnboarding.alsoCounsellor.label' });
    const fillAccount = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(await screen.findByLabelText('cards.advisorAccount.username'), 'oskar_b');
        await user.type(screen.getByLabelText('cards.advisorAccount.password'), 'SecurePass1!');
    };

    it("shows the inviter's preset as a switch and sends it on register (on: topics like a counsellor)", async () => {
        const client = createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(AGENCY_ADMIN_INVITE) });
        const user = userEvent.setup();
        renderFlow(client);

        expect(await screen.findByText('counsellorOnboarding.agencyAdminTitle')).toBeInTheDocument();
        expect(alsoCounsellorSwitch()).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('heading', { name: 'cards.focusTopics.title' })).toBeInTheDocument();

        await fillAccount(user);
        await user.click(submit());

        await waitFor(() => expect(client.registerCounsellor).toHaveBeenCalledTimes(1));
        expect(client.registerCounsellor).toHaveBeenCalledWith(
            'raw-token',
            expect.objectContaining({ alsoCounsellor: true, topicIds: [12, 13] }),
        );
    });

    it('toggles "Berät auch" when the visible label text is clicked', async () => {
        const client = createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(AGENCY_ADMIN_INVITE) });
        const user = userEvent.setup();
        renderFlow(client);
        await screen.findByText('counsellorOnboarding.agencyAdminTitle');

        // The visible text is hidden from assistive tech (the switch carries the name), so find it by its node.
        const visibleLabel = screen
            .getAllByText('counsellorOnboarding.alsoCounsellor.label')
            .find((node) => node.getAttribute('aria-hidden') === 'true') as HTMLElement;
        await user.click(visibleLabel);

        expect(alsoCounsellorSwitch()).toHaveAttribute('aria-checked', 'false');
    });

    it('with "Berät auch" off: no topic step, no counsellor profile, registers as agency admin only', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({ ...AGENCY_ADMIN_INVITE, alsoCounsellor: false }),
        });
        const user = userEvent.setup();
        renderFlow(client);

        expect(
            await screen.findByRole('switch', { name: 'counsellorOnboarding.alsoCounsellor.label' }),
        ).toHaveAttribute('aria-checked', 'false');
        expect(screen.queryByRole('heading', { name: 'cards.focusTopics.title' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'cards.avatarName.title' })).not.toBeInTheDocument();

        await fillAccount(user);
        expect(submit()).toBeEnabled();
        await user.click(submit());

        await waitFor(() => expect(client.registerCounsellor).toHaveBeenCalledTimes(1));
        const request = (client.registerCounsellor as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(request.alsoCounsellor).toBe(false);
        expect(request.topicIds).toEqual([]);
        expect(request.avatar).toBeUndefined();
    });

    it('lets the invitee change the preset: switching on brings the topics back and they are required', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...AGENCY_ADMIN_INVITE,
                alsoCounsellor: false,
                topics: [],
                availableTopics: [{ id: 14, name: 'Suchtberatung' }],
            }),
        });
        const user = userEvent.setup();
        renderFlow(client);

        await fillAccount(user);
        expect(submit()).toBeEnabled();

        await user.click(alsoCounsellorSwitch());
        expect(alsoCounsellorSwitch()).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('heading', { name: 'cards.focusTopics.title' })).toBeInTheDocument();
        // No topic picked yet: counselling needs one.
        expect(submit()).toBeDisabled();

        await addTopic(user, 'Suchtberatung');
        await user.click(submit());
        await waitFor(() =>
            expect(client.registerCounsellor).toHaveBeenCalledWith(
                'raw-token',
                expect.objectContaining({ alsoCounsellor: true, topicIds: [14] }),
            ),
        );
    });

    // A founding admin must give the new agency a topic, or its queued counsellors have nothing to pick.
    describe('founding a new agency', () => {
        const FOUNDING_INVITE: CounsellorOnboardingInviteDTO = {
            ...AGENCY_ADMIN_INVITE,
            agencyExists: false,
            topics: [],
            availableTopics: [{ id: 14, name: 'Suchtberatung' }],
        };
        const nameAgency = async (user: ReturnType<typeof userEvent.setup>) =>
            user.type(screen.getByLabelText('counsellorOnboarding.agency.name'), 'Suchtberatung Nord');

        it('without counselling still requires one topic for the agency and sends it', async () => {
            const client = createClient({
                getOnboardingInvite: vi.fn().mockResolvedValue({ ...FOUNDING_INVITE, alsoCounsellor: false }),
            });
            const user = userEvent.setup();
            renderFlow(client);

            await fillAccount(user);
            await nameAgency(user);
            // No counsellor profile, but the topic step stays — it is the agency's.
            expect(screen.queryByRole('heading', { name: 'cards.avatarName.title' })).not.toBeInTheDocument();
            expect(screen.getByText('counsellorOnboarding.topics.agencyTopicsHint')).toBeInTheDocument();
            expect(submit()).toBeDisabled();

            await addTopic(user, 'Suchtberatung');
            expect(submit()).toBeEnabled();
            await user.click(submit());

            await waitFor(() => expect(client.registerCounsellor).toHaveBeenCalledTimes(1));
            expect(client.registerCounsellor).toHaveBeenCalledWith(
                'raw-token',
                expect.objectContaining({
                    alsoCounsellor: false,
                    topicIds: [14],
                    agency: { name: 'Suchtberatung Nord' },
                }),
            );
        });

        it('asks before "Berät auch" goes off; "Doch selbst beraten" keeps it on', async () => {
            const client = createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(FOUNDING_INVITE) });
            const user = userEvent.setup();
            renderFlow(client);

            await user.click(await screen.findByRole('switch', { name: 'counsellorOnboarding.alsoCounsellor.label' }));
            const dialog = await screen.findByRole('dialog');
            expect(within(dialog).getByText('counsellorOnboarding.alsoCounsellorOff.title')).toBeInTheDocument();
            expect(within(dialog).getByText('counsellorOnboarding.alsoCounsellorOff.body')).toBeInTheDocument();

            await user.click(
                within(dialog).getByRole('button', { name: 'counsellorOnboarding.alsoCounsellorOff.keep' }),
            );
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            expect(alsoCounsellorSwitch()).toHaveAttribute('aria-checked', 'true');
        });

        it('"Ja, nur Admin" turns it off and the topic step stays mandatory', async () => {
            const client = createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(FOUNDING_INVITE) });
            const user = userEvent.setup();
            renderFlow(client);

            await fillAccount(user);
            await nameAgency(user);
            await user.click(alsoCounsellorSwitch());
            await user.click(
                await screen.findByRole('button', { name: 'counsellorOnboarding.alsoCounsellorOff.confirm' }),
            );
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            expect(alsoCounsellorSwitch()).toHaveAttribute('aria-checked', 'false');
            expect(screen.getByRole('heading', { name: 'cards.focusTopics.title' })).toBeInTheDocument();
            expect(submit()).toBeDisabled();
        });

        it('an existing agency switches off without asking', async () => {
            const client = createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(AGENCY_ADMIN_INVITE) });
            const user = userEvent.setup();
            renderFlow(client);

            await user.click(await screen.findByRole('switch', { name: 'counsellorOnboarding.alsoCounsellor.label' }));
            expect(alsoCounsellorSwitch()).toHaveAttribute('aria-checked', 'false');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('treats an agency admin who counsels as CREATE, whatever topic level the invite carries', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({ ...AGENCY_ADMIN_INVITE, topicPermission: 'NONE' }),
        });
        renderFlow(client);

        // The "+" of CREATE, not the fixed agency chips of NONE (backend: agency admins always CREATE).
        expect(await screen.findByRole('button', { name: 'counsellorOnboarding.topics.add' })).toBeInTheDocument();
        expect(screen.queryByTestId('wizard-agency-topics')).not.toBeInTheDocument();
    });

    it('a counsellor invite shows no switch and sends no alsoCounsellor', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        await fillAccount(user);
        expect(
            screen.queryByRole('switch', { name: 'counsellorOnboarding.alsoCounsellor.label' }),
        ).not.toBeInTheDocument();
        await user.click(submit());
        await waitFor(() => expect(client.registerCounsellor).toHaveBeenCalledTimes(1));
        expect((client.registerCounsellor as ReturnType<typeof vi.fn>).mock.calls[0][1]).not.toHaveProperty(
            'alsoCounsellor',
        );
    });
});
