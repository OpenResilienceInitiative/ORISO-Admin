import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
    CounsellorOnboardingClient,
    CounsellorOnboardingInviteDTO,
    InviteLinkError,
    TwoFactorCodeInvalidError,
} from '../../api/counsellorOnboarding/counsellorOnboarding';
import { useCounsellorOnboardingFlow } from './useCounsellorOnboardingFlow';

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

describe('useCounsellorOnboardingFlow', () => {
    it('refreshes topic names on language change while preserving all collected data and invite permissions', async () => {
        const germanInvite = {
            ...INVITE,
            agencyExists: false,
            availableTopics: [{ id: 14, name: 'Suchtberatung' }],
        };
        const englishInvite = {
            ...germanInvite,
            topicPermission: 'SELECT_EXISTING' as const,
            topics: [
                { id: 12, name: 'Family counselling' },
                { id: 13, name: 'Debt counselling' },
            ],
            availableTopics: [
                { id: 14, name: 'Addiction counselling' },
                { id: 99, name: 'Unrelated' },
            ],
        };
        const getOnboardingInvite = vi.fn().mockResolvedValueOnce(germanInvite).mockResolvedValueOnce(englishInvite);
        const client = createClient({ getOnboardingInvite });
        const { result, rerender } = renderHook(
            ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
            { initialProps: { language: 'de' } },
        );
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        act(() => {
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
            result.current.updatePerson({ position: 'Leitung', title: 'Dipl.' });
            result.current.updateNames({ publicName: 'Lena', internalName: 'Lena B.' });
            result.current.updateAvatar({ avatarKind: 'INITIALS', avatarId: 'LB' });
            result.current.updateAgency({ name: 'Meine Beratungsstelle' });
            result.current.setAlsoCounsellor(false);
            result.current.setTopics([14]);
        });
        const enteredData = result.current.data;

        rerender({ language: 'en' });
        await waitFor(() => expect(result.current.invite?.topics[0].name).toBe('Family counselling'));

        expect(result.current.data).toEqual(enteredData);
        expect(result.current.state.phase).toBe('form');
        expect(result.current.invite?.topicPermission).toBe(INVITE.topicPermission);
        expect(result.current.invite?.availableTopics).toEqual([{ id: 14, name: 'Addiction counselling' }]);
        expect(getOnboardingInvite).toHaveBeenCalledTimes(2);
    });

    it('ignores a stale language response after switching back to German', async () => {
        let resolveEnglish!: (value: CounsellorOnboardingInviteDTO) => void;
        const client = createClient({
            getOnboardingInvite: vi
                .fn()
                .mockResolvedValueOnce(INVITE)
                .mockImplementationOnce(
                    () =>
                        new Promise<CounsellorOnboardingInviteDTO>((resolve) => {
                            resolveEnglish = resolve;
                        }),
                ),
        });
        const { result, rerender } = renderHook(
            ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
            { initialProps: { language: 'de' } },
        );
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        rerender({ language: 'en' });
        await waitFor(() => expect(client.getOnboardingInvite).toHaveBeenCalledTimes(2));
        rerender({ language: 'de' });
        await act(async () => resolveEnglish({ ...INVITE, topics: [{ id: 12, name: 'Family counselling' }] }));
        expect(result.current.invite?.topics[0].name).toBe('Familienberatung');
        expect(result.current.data.topicIds).toEqual([12, 13]);
    });

    it.each(['CONSUMED', 'REVOKED', 'EXPIRED', 'INVALID'] as const)(
        'keeps a %s invite terminal when resolving translated names',
        async (reason) => {
            const client = createClient({
                getOnboardingInvite: vi
                    .fn()
                    .mockResolvedValueOnce(INVITE)
                    .mockRejectedValueOnce(new InviteLinkError(reason)),
            });
            const { result, rerender } = renderHook(
                ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
                { initialProps: { language: 'de' } },
            );
            await waitFor(() => expect(result.current.state.phase).toBe('form'));
            rerender({ language: 'en' });
            await waitFor(() => expect(result.current.state).toEqual({ phase: 'link-error', reason }));
            await act(async () => {
                await result.current.submitRegistration();
            });
            expect(client.registerCounsellor).not.toHaveBeenCalled();
            expect(result.current.topicLanguageError).toBe(false);
        },
    );

    it('retries a failed translation refresh without resetting names or selection', async () => {
        const client = createClient({
            getOnboardingInvite: vi
                .fn()
                .mockResolvedValueOnce(INVITE)
                .mockRejectedValueOnce(new Error('offline'))
                .mockResolvedValueOnce({
                    ...INVITE,
                    topics: [{ id: 12, name: 'Family counselling' }, INVITE.topics[1]],
                }),
        });
        const { result, rerender } = renderHook(
            ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
            { initialProps: { language: 'de' } },
        );
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        act(() => {
            result.current.updateNames({ publicName: 'Lena' });
            result.current.setTopics([12]);
        });
        rerender({ language: 'en' });
        await waitFor(() => expect(result.current.topicLanguageError).toBe(true));
        act(() => result.current.retryTopicNames());
        await waitFor(() => expect(result.current.invite?.topics[0].name).toBe('Family counselling'));
        expect(result.current.topicLanguageError).toBe(false);
        expect(result.current.data.names.publicName).toBe('Lena');
        expect(result.current.data.topicIds).toEqual([12]);
    });

    it('refreshes after a language switch during initial loading', async () => {
        let resolveInitial!: (value: CounsellorOnboardingInviteDTO) => void;
        const client = createClient({
            getOnboardingInvite: vi
                .fn()
                .mockImplementationOnce(
                    () =>
                        new Promise<CounsellorOnboardingInviteDTO>((resolve) => {
                            resolveInitial = resolve;
                        }),
                )
                .mockResolvedValueOnce({
                    ...INVITE,
                    topics: [{ id: 12, name: 'Family counselling' }, INVITE.topics[1]],
                }),
        });
        const { result, rerender } = renderHook(
            ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
            { initialProps: { language: 'de' } },
        );
        rerender({ language: 'en' });
        await act(async () => resolveInitial(INVITE));
        await waitFor(() => expect(result.current.invite?.topics[0].name).toBe('Family counselling'));
        expect(result.current.data.topicIds).toEqual([12, 13]);
    });

    it('ignores an old invite translation after switching tokens', async () => {
        let resolveEnglish!: (value: CounsellorOnboardingInviteDTO) => void;
        const client = createClient({
            getOnboardingInvite: vi
                .fn()
                .mockResolvedValueOnce(INVITE)
                .mockImplementationOnce(
                    () =>
                        new Promise<CounsellorOnboardingInviteDTO>((resolve) => {
                            resolveEnglish = resolve;
                        }),
                )
                .mockResolvedValueOnce({ ...INVITE, agencyId: 99, topics: [{ id: 24, name: 'New agency topic' }] }),
        });
        const { result, rerender } = renderHook(
            ({ language, token }) => useCounsellorOnboardingFlow(token, client, language),
            { initialProps: { language: 'de', token: 'first-token' } },
        );
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        rerender({ language: 'en', token: 'first-token' });
        await waitFor(() => expect(client.getOnboardingInvite).toHaveBeenCalledTimes(2));
        rerender({ language: 'en', token: 'second-token' });
        await waitFor(() => expect(result.current.invite?.agencyId).toBe(99));
        await act(async () => resolveEnglish({ ...INVITE, topics: [{ id: 12, name: 'Old translated topic' }] }));
        expect(result.current.invite?.topics).toEqual([{ id: 24, name: 'New agency topic' }]);
        expect(result.current.data.topicIds).toEqual([24]);
    });

    it.each([null, { secret: 'TEST234567ABCDEFG', qrCodeBase64: null }])(
        'resumes two-factor setup completed in another tab during a language change',
        async (twoFactor) => {
            const client = createClient({
                getOnboardingInvite: vi
                    .fn()
                    .mockResolvedValueOnce(INVITE)
                    .mockResolvedValueOnce({ ...INVITE, phase: 'PENDING_2FA_ACTIVATION', twoFactor }),
            });
            const { result, rerender } = renderHook(
                ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
                { initialProps: { language: 'de' } },
            );
            await waitFor(() => expect(result.current.state.phase).toBe('form'));
            act(() => result.current.updateNames({ publicName: 'Lena' }));
            rerender({ language: 'en' });
            await waitFor(() =>
                expect(result.current.state).toEqual({
                    phase: 'two-factor',
                    result: { twoFactor, resumed: true },
                }),
            );
            expect(result.current.data.names.publicName).toBe('Lena');
            await act(async () => {
                await result.current.submitRegistration();
            });
            expect(client.registerCounsellor).not.toHaveBeenCalled();
            rerender({ language: 'de' });
            expect(client.getOnboardingInvite).toHaveBeenCalledTimes(2);
        },
    );

    it('does not resolve locale metadata while registration is in flight', async () => {
        let completeRegistration!: (value: { consultantId: string; phase: 'PENDING_2FA_ACTIVATION' }) => void;
        const client = createClient({
            registerCounsellor: vi.fn().mockImplementation(
                () =>
                    new Promise((resolve) => {
                        completeRegistration = resolve;
                    }),
            ),
        });
        const { result, rerender } = renderHook(
            ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
            { initialProps: { language: 'de' } },
        );
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        let submission!: Promise<void>;
        act(() => {
            submission = result.current.submitRegistration();
        });
        await waitFor(() => expect(result.current.busy).toBe(true));
        rerender({ language: 'en' });
        expect(client.getOnboardingInvite).toHaveBeenCalledTimes(1);
        await act(async () => {
            completeRegistration({ consultantId: 'consultant-1', phase: 'PENDING_2FA_ACTIVATION' });
            await submission;
        });
        expect(result.current.state.phase).toBe('two-factor');
        expect(client.getOnboardingInvite).toHaveBeenCalledTimes(1);
    });

    it('does not resolve topics again when changing language in the two-factor step', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({ ...INVITE, phase: 'PENDING_2FA_ACTIVATION' }),
        });
        const { result, rerender } = renderHook(
            ({ language }) => useCounsellorOnboardingFlow('raw-token', client, language),
            { initialProps: { language: 'de' } },
        );
        await waitFor(() => expect(result.current.state.phase).toBe('two-factor'));
        rerender({ language: 'en' });
        expect(client.getOnboardingInvite).toHaveBeenCalledTimes(1);
        expect(result.current.state.phase).toBe('two-factor');
    });

    it('walks the happy path: loading → form → two-factor → done', async () => {
        const client = createClient();
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));

        expect(result.current.state.phase).toBe('loading');
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        expect(result.current.invite?.recipientEmail).toBe('lena@tenant.example');
        // The whole coverage arrives preselected; the invitee drops one topic.
        expect(result.current.data.topicIds).toEqual([12, 13]);

        act(() => {
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
            result.current.updatePerson({ salutation: 'counsellor_female', position: 'Leitung', title: 'Dipl.' });
            result.current.updateNames({ publicName: 'Lena', internalName: 'Lena B.' });
            result.current.toggleTopic(13);
        });

        await act(async () => {
            await result.current.submitRegistration();
        });
        expect(result.current.state.phase).toBe('two-factor');
        expect(client.registerCounsellor).toHaveBeenCalledWith('raw-token', {
            account: { username: 'lena_b', password: 'SecurePass1!' },
            person: { salutation: 'counsellor_female', position: 'Leitung', title: 'Dipl.' },
            names: { publicName: 'Lena', internalDisplayName: 'Lena B.' },
            topicIds: [12],
        });

        await act(async () => {
            await result.current.submitTwoFactorCode('123456');
        });
        expect(result.current.state.phase).toBe('done');
        expect(client.activateTwoFactor).toHaveBeenCalledWith('raw-token', '123456');
    });

    it('preselects the topic when the coverage holds exactly one', async () => {
        const client = createClient({
            getOnboardingInvite: vi
                .fn()
                .mockResolvedValue({ ...INVITE, topics: [{ id: 12, name: 'Familienberatung' }] }),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));

        await waitFor(() => expect(result.current.state.phase).toBe('form'));

        expect(result.current.data.topicIds).toEqual([12]);
    });

    it('resets collected data when the token switches to another invite', async () => {
        const newAgencyInvite: CounsellorOnboardingInviteDTO = {
            ...INVITE,
            agencyId: 13,
            departmentId: null,
            agencyExists: false,
            topics: [],
            availableTopics: [{ id: 21, name: 'Suchtberatung' }],
        };
        const client = createClient({
            getOnboardingInvite: vi
                .fn()
                .mockImplementation((token: string) =>
                    Promise.resolve(token === 'raw-token' ? INVITE : newAgencyInvite),
                ),
        });
        const { result, rerender } = renderHook(({ token }) => useCounsellorOnboardingFlow(token, client), {
            initialProps: { token: 'raw-token' },
        });
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        expect(result.current.data.topicIds).toEqual([12, 13]);
        act(() => {
            result.current.updateAgency({ name: 'Alte Stelle' });
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
        });

        rerender({ token: 'other-token' });
        await waitFor(() => expect(result.current.invite?.agencyId).toBe(13));

        // No stale coverage ids and no stale agency name survive the switch.
        expect(result.current.data.topicIds).toEqual([]);
        expect(result.current.data.agency.name).toBe('');
        expect(result.current.data.account.username).toBe('');
    });

    it('omits empty optional fields from the registration payload', async () => {
        const client = createClient();
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('form'));

        act(() => {
            result.current.updateAccount({ username: '  lena_b  ', password: 'SecurePass1!' });
            result.current.setTopics([13]);
        });
        await act(async () => {
            await result.current.submitRegistration();
        });

        expect(client.registerCounsellor).toHaveBeenCalledWith('raw-token', {
            account: { username: 'lena_b', password: 'SecurePass1!' },
            person: { salutation: undefined, position: undefined, title: undefined },
            names: { publicName: undefined, internalDisplayName: undefined },
            topicIds: [13],
        });
    });

    it('skips the 2FA step when registration answers COMPLETED (waived gate)', async () => {
        const client = createClient({
            registerCounsellor: vi
                .fn()
                .mockResolvedValue({ consultantId: 'consultant-1', phase: 'COMPLETED', twoFactor: null }),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('form'));

        act(() => {
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
            result.current.toggleTopic(12);
        });
        await act(async () => {
            await result.current.submitRegistration();
        });

        expect(result.current.state.phase).toBe('done');
    });

    it('resumes a consumed-but-2FA-pending link directly at the 2FA step', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...INVITE,
                phase: 'PENDING_2FA_ACTIVATION',
                twoFactor: { secret: 'STOREDSECRET', qrCodeBase64: null },
            }),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));

        await waitFor(() => expect(result.current.state.phase).toBe('two-factor'));
        expect(result.current.state).toMatchObject({
            phase: 'two-factor',
            result: { resumed: true, twoFactor: { secret: 'STOREDSECRET', qrCodeBase64: null } },
        });
    });

    it('maps a dead link to the terminal link-error state', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockRejectedValue(new InviteLinkError('EXPIRED')),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));

        await waitFor(() => expect(result.current.state).toEqual({ phase: 'link-error', reason: 'EXPIRED' }));
    });

    it('treats a transient resolve failure as retryable load-error, not as invalid link', async () => {
        const failingThenOk = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(INVITE);
        const client = createClient({ getOnboardingInvite: failingThenOk });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));

        await waitFor(() => expect(result.current.state.phase).toBe('load-error'));

        act(() => result.current.retryLoad());
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
    });

    it('an empty token is a link error without any backend call', async () => {
        const client = createClient();
        const { result } = renderHook(() => useCounsellorOnboardingFlow('', client));

        expect(result.current.state).toEqual({ phase: 'link-error', reason: 'INVALID' });
        expect(client.getOnboardingInvite).not.toHaveBeenCalled();
    });

    it('a registration losing against a concurrent consumption becomes the terminal link error', async () => {
        const client = createClient({
            registerCounsellor: vi.fn().mockRejectedValue(new InviteLinkError('CONSUMED')),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('form'));

        act(() => {
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
            result.current.toggleTopic(12);
        });
        await act(async () => {
            await result.current.submitRegistration();
        });

        expect(result.current.state).toEqual({ phase: 'link-error', reason: 'CONSUMED' });
    });

    it('a rejected one-time password stays retryable with the invalid-code error', async () => {
        const client = createClient({
            activateTwoFactor: vi.fn().mockRejectedValue(new TwoFactorCodeInvalidError()),
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...INVITE,
                phase: 'PENDING_2FA_ACTIVATION',
                twoFactor: { secret: 'STOREDSECRET', qrCodeBase64: null },
            }),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('two-factor'));

        await act(async () => {
            await result.current.submitTwoFactorCode('000000');
        });

        expect(result.current.state.phase).toBe('two-factor');
        expect(result.current.submitError).toBe('two-factor-code');
    });

    it('a retryable registration failure keeps the form state and reports it', async () => {
        const client = createClient({
            registerCounsellor: vi.fn().mockRejectedValue(new Error('HTTP 500')),
        });
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('form'));

        act(() => {
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
            result.current.toggleTopic(12);
        });
        await act(async () => {
            await result.current.submitRegistration();
        });

        expect(result.current.state.phase).toBe('form');
        expect(result.current.submitError).toBe('registration');
    });
});
