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
    it('walks the happy path: loading → form → two-factor → done', async () => {
        const client = createClient();
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));

        expect(result.current.state.phase).toBe('loading');
        await waitFor(() => expect(result.current.state.phase).toBe('form'));
        expect(result.current.invite?.recipientEmail).toBe('lena@tenant.example');

        act(() => {
            result.current.updateAccount({ username: 'lena_b', password: 'SecurePass1!' });
            result.current.updatePerson({ salutation: 'counsellor_female', position: 'Leitung', title: 'Dipl.' });
            result.current.updateNames({ publicName: 'Lena', internalName: 'Lena B.' });
            result.current.toggleTopic(12);
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

    it('omits empty optional fields from the registration payload', async () => {
        const client = createClient();
        const { result } = renderHook(() => useCounsellorOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('form'));

        act(() => {
            result.current.updateAccount({ username: '  lena_b  ', password: 'SecurePass1!' });
            result.current.toggleTopic(13);
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
