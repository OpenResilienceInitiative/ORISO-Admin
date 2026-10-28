import { ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateUserData } from './useUpdateUserData.hook';
import { useUpdateUserPassword } from './useUpdateUserPassword.hook';
import { useAddOrUpdateTenantAdmin } from './useAddOrUpdateTenantAdmin.hook';
import { useAddOrUpdateConsultantOrAdmin } from './useAddOrUpdateConsultantOrAgencyAdmin';
import {
    useUserTwoFactorAuth,
    useUserTwoFactorDelete,
    useUserTwoFactorSendEmailCode,
} from './useUserTwoFactorAuth.hook';
import { TypeOfUser } from '../enums/TypeOfUser';
import { AccountOperationIntent, isTerminalAccountOperationRefusal } from '../utils/accountOperationIntent';
import { recordAccountOperationResponse } from '../utils/accountOperationState';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), tenantRecord: { username: 'original-login' } }));
vi.mock('../api/fetchData', async () => {
    const original = await vi.importActual<typeof import('../api/fetchData')>('../api/fetchData');
    return { ...original, fetchData: (...args: unknown[]) => mocks.fetch(...args) };
});
vi.mock('./useTenantUserAdminData', () => ({
    TENANT_ADMIN_QUERY_KEY: 'TENANT_ADMIN',
    TENANT_ADMINS_QUERY_KEY: 'TENANT_ADMINS',
    useTenantUserAdminData: () => ({ data: mocks.tenantRecord }),
}));

const clients: QueryClient[] = [];
const wrapperFor = (retry: false | number = false) => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry, retryDelay: 0 } },
    });
    clients.push(client);
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};
const keyAt = (index: number) => mocks.fetch.mock.calls[index][0].headersData['Idempotency-Key'];
const bodyAt = (index: number) => mocks.fetch.mock.calls[index][0].bodyData;

afterEach(() => {
    cleanup();
    clients.splice(0).forEach((client) => client.clear());
});
beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.tenantRecord = { username: 'original-login' };
});

describe('mounted account mutation ownership with real React Query', () => {
    it.each([
        ['profile', () => useUpdateUserData()],
        ['password', () => useUpdateUserPassword()],
        ['tenant-admin', () => useAddOrUpdateTenantAdmin({ id: '42' })],
        ['agency-admin', () => useAddOrUpdateConsultantOrAdmin({ id: '42', typeOfUser: TypeOfUser.AgencyAdmins })],
        ['otp-activate', () => useUserTwoFactorAuth()],
        ['otp-delete', () => useUserTwoFactorDelete()],
        ['otp-send', () => useUserTwoFactorSendEmailCode()],
    ] as const)('keeps the %s input edit callback stable across mounted rerenders', (_name, useAction) => {
        const { result, rerender } = renderHook(useAction, { wrapper: wrapperFor() });
        const first = result.current.onAccountEdit;
        rerender();
        expect(result.current.onAccountEdit, 'account-intent-stable-mounted-edit-callback').toBe(first);
    });

    it('retries an unknown profile write exactly and starts a new intent after acknowledgement', async () => {
        mocks.fetch.mockRejectedValueOnce(new TypeError('reply lost')).mockResolvedValue({ email: 'new@example.test' });
        const { result, rerender } = renderHook(() => useUpdateUserData(), { wrapper: wrapperFor() });
        await act(async () => {
            await expect(result.current.mutateAsync({ email: 'new@example.test' })).rejects.toThrow('reply lost');
        });
        rerender();
        await act(async () => {
            await result.current.mutateAsync({ email: 'new@example.test' });
        });
        expect(keyAt(0)).toEqual(expect.any(String));
        expect(keyAt(1)).toBe(keyAt(0));
        expect(bodyAt(1)).toBe(bodyAt(0));
        await act(async () => {
            await result.current.mutateAsync({ email: 'new@example.test' });
        });
        expect(keyAt(2)).not.toBe(keyAt(0));
        expect(JSON.parse(bodyAt(0))).toEqual({ email: 'new@example.test' });
    });

    it('captures password variables before Query retries despite a later caller edit', async () => {
        mocks.fetch.mockRejectedValueOnce(new TypeError('reply lost')).mockResolvedValue(undefined);
        const { result } = renderHook(() => useUpdateUserPassword(), { wrapper: wrapperFor(1) });
        const submitted = { oldPassword: 'old-test-value', newPassword: 'new-test-value' };
        await act(async () => {
            const pending = result.current.mutateAsync(submitted);
            submitted.newPassword = 'edited-after-submit';
            await pending;
        });
        expect(mocks.fetch).toHaveBeenCalledTimes(2);
        expect(keyAt(0)).toBe(keyAt(1));
        expect(bodyAt(0)).toBe(bodyAt(1));
        expect(JSON.parse(bodyAt(0))).toEqual({ oldPassword: 'old-test-value', newPassword: 'new-test-value' });
    });

    it('supersedes edit-away-and-back without reusing the previous profile identity', async () => {
        mocks.fetch.mockRejectedValue(new TypeError('reply lost'));
        const { result, rerender } = renderHook(() => useUpdateUserData(), { wrapper: wrapperFor() });
        await act(async () => {
            await expect(result.current.mutateAsync({ email: 'first@example.test' })).rejects.toThrow();
        });
        act(() => {
            result.current.onAccountEdit();
        });
        rerender();
        act(() => {
            result.current.onAccountEdit();
        });
        await act(async () => {
            await expect(result.current.mutateAsync({ email: 'first@example.test' })).rejects.toThrow();
        });
        expect(bodyAt(1)).toBe(bodyAt(0));
        expect(keyAt(1)).not.toBe(keyAt(0));
    });

    it('keeps the submitted tenant username when cached query data changes after an unknown reply', async () => {
        mocks.fetch.mockRejectedValueOnce(new TypeError('reply lost')).mockResolvedValue({});
        const { result, rerender } = renderHook(() => useAddOrUpdateTenantAdmin({ id: '42' }), {
            wrapper: wrapperFor(),
        });
        const submitted = { email: 'admin@example.test' };
        await act(async () => {
            await expect(result.current.mutateAsync(submitted as never)).rejects.toThrow();
        });
        mocks.tenantRecord = { username: 'background-login' };
        rerender();
        await act(async () => {
            await result.current.mutateAsync(submitted as never);
        });
        expect(bodyAt(1)).toBe(bodyAt(0));
        expect(keyAt(1)).toBe(keyAt(0));
        expect(JSON.parse(bodyAt(1)).username).toBe('original-login');
        act(() => {
            result.current.onAccountEdit();
        });
        await act(async () => {
            await result.current.mutateAsync(submitted as never);
        });
        expect(JSON.parse(bodyAt(2)).username).toBe('background-login');
        expect(keyAt(2)).not.toBe(keyAt(0));
    });

    it('reuses separate agency and profile identities across one unknown composite save', async () => {
        mocks.fetch
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new TypeError('profile reply lost'))
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ json: async () => ({ _embedded: {} }) });
        const { result } = renderHook(
            () => useAddOrUpdateConsultantOrAdmin({ id: '42', typeOfUser: TypeOfUser.AgencyAdmins }),
            { wrapper: wrapperFor() },
        );
        const submitted = { email: 'agency-admin@example.test', agencies: [{ value: '7' }] };
        await act(async () => {
            await expect(result.current.mutateAsync(submitted as never)).rejects.toThrow('profile reply lost');
        });
        await act(async () => {
            await result.current.mutateAsync(submitted as never);
        });
        expect(mocks.fetch).toHaveBeenCalledTimes(4);
        expect(keyAt(0)).not.toBe(keyAt(1));
        expect(keyAt(2)).toBe(keyAt(0));
        expect(keyAt(3)).toBe(keyAt(1));
        expect(bodyAt(2)).toBe(bodyAt(0));
        expect(bodyAt(3)).toBe(bodyAt(1));
    });

    it('keeps an unknown email-code resend and allocates a new intentional resend after acknowledgement', async () => {
        mocks.fetch.mockRejectedValueOnce(new TypeError('delivery reply lost')).mockResolvedValue(undefined);
        const { result } = renderHook(() => useUserTwoFactorSendEmailCode(), { wrapper: wrapperFor() });
        await act(async () => {
            await expect(result.current.mutateAsync('otp@example.test')).rejects.toThrow();
        });
        await act(async () => {
            await result.current.mutateAsync('otp@example.test');
        });
        await act(async () => {
            await result.current.mutateAsync('otp@example.test');
        });
        expect(keyAt(1)).toBe(keyAt(0));
        expect(bodyAt(1)).toBe(bodyAt(0));
        expect(keyAt(2)).not.toBe(keyAt(0));
    });
});

[TypeOfUser.Consultants, TypeOfUser.AgencyAdmins].forEach((typeOfUser) => {
    describe(`C2 actual ${typeOfUser} composite API through its mounted mutation hook`, () => {
        it.each([400, 403, 409])(
            'finishes known agency success plus observed profile refusal %s before an unchanged new Save',
            async (status) => {
                let parent: AccountOperationIntent | undefined;
                const failure = new Error('verified profile refusal');
                mocks.fetch
                    .mockResolvedValueOnce({ status: 200 })
                    .mockImplementationOnce((request) => {
                        const response = new Response(null, {
                            status,
                            headers: {
                                'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                                'X-ORISO-Mutation-Operation': request.headersData['Idempotency-Key'],
                            },
                        });
                        // This test replaces fetchData's boundary, so register the same
                        // copied transport evidence that the real helper records.
                        recordAccountOperationResponse(failure, response);
                        return Promise.reject(failure);
                    })
                    .mockResolvedValueOnce({ status: 200 })
                    .mockResolvedValueOnce({ status: 200, json: async () => ({ _embedded: {} }) });
                const { result } = renderHook(
                    () =>
                        useAddOrUpdateConsultantOrAdmin({
                            id: '42',
                            typeOfUser,
                            onError: (_error, variables) => {
                                parent = variables.operationIntent;
                            },
                        }),
                    { wrapper: wrapperFor() },
                );
                const submitted = { email: 'same@example.test', agencies: [{ value: '7' }] };
                await act(async () => {
                    await expect(result.current.mutateAsync(submitted as never)).rejects.toBe(failure);
                });
                expect(parent).toBeDefined();
                expect(
                    isTerminalAccountOperationRefusal(failure, parent),
                    'agency success must not become whole-save NO_EFFECT',
                ).toBe(false);
                expect(mocks.fetch).toHaveBeenCalledTimes(2);
                expect(mocks.fetch.mock.calls[0][0].url).toContain(
                    `${typeOfUser === TypeOfUser.Consultants ? 'consultants' : 'agencyadmins'}/42/agencies`,
                );
                await act(async () => {
                    await result.current.mutateAsync(submitted as never);
                });
                expect(mocks.fetch).toHaveBeenCalledTimes(4);
                expect(keyAt(2), 'C2-known-partial-result-starts-fresh-agency-child').not.toBe(keyAt(0));
                expect(keyAt(3), 'C2-known-partial-result-starts-fresh-profile-child').not.toBe(keyAt(1));
                expect(bodyAt(2)).toBe(bodyAt(0));
                expect(bodyAt(3)).toBe(bodyAt(1));
            },
        );

        it('preserves exact children when agency succeeded, profile stayed unknown and a later agency retry is verified refused', async () => {
            const failure = new Error('verified later agency refusal');
            mocks.fetch
                .mockResolvedValueOnce({ status: 200 })
                .mockRejectedValueOnce(new TypeError('profile reply lost'))
                .mockImplementationOnce((request) => {
                    const response = new Response(null, {
                        status: 403,
                        headers: {
                            'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                            'X-ORISO-Mutation-Operation': request.headersData['Idempotency-Key'],
                        },
                    });
                    recordAccountOperationResponse(failure, response);
                    return Promise.reject(failure);
                })
                .mockResolvedValueOnce({ status: 200 })
                .mockResolvedValueOnce({ status: 200, json: async () => ({ _embedded: {} }) });
            const { result } = renderHook(() => useAddOrUpdateConsultantOrAdmin({ id: '42', typeOfUser }), {
                wrapper: wrapperFor(),
            });
            const submitted = { email: 'same@example.test', agencies: [{ value: '7' }] };
            await act(async () => {
                await expect(result.current.mutateAsync(submitted as never)).rejects.toThrow('profile reply lost');
            });
            await act(async () => {
                await expect(result.current.mutateAsync(submitted as never)).rejects.toBe(failure);
            });
            await act(async () => {
                await result.current.mutateAsync(submitted as never);
            });
            expect(mocks.fetch).toHaveBeenCalledTimes(5);
            expect(keyAt(2)).toBe(keyAt(0));
            expect(keyAt(3)).toBe(keyAt(0));
            expect(keyAt(4)).toBe(keyAt(1));
            expect(bodyAt(3)).toBe(bodyAt(0));
            expect(bodyAt(4)).toBe(bodyAt(1));
        });
    });
});
