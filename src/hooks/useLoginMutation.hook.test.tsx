import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantAccessEndpoint } from '../appConfig';
import { FETCH_METHODS } from '../api/fetchData';
import { ADMIN_PORTAL_ACCESS_DENIED, TENANT_ACCESS_DENIED, useLoginMutation } from './useLoginMutation.hook';

const mocks = vi.hoisted(() => ({
    apiServerSettings: vi.fn(),
    fetchData: vi.fn(),
    getAccessToken: vi.fn(),
    hasAdminPortalAccess: vi.fn(),
    onError: vi.fn(),
    onSuccess: vi.fn(),
    setServerSettings: vi.fn(),
    setTokens: vi.fn(),
}));

vi.mock('../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: { useApiClusterSettings: false },
        setServerSettings: mocks.setServerSettings,
    }),
}));

vi.mock('../api/auth/getAccessToken', () => ({
    default: mocks.getAccessToken,
}));

vi.mock('../api/auth/auth', () => ({
    setTokens: mocks.setTokens,
}));

vi.mock('../api/fetchData', async () => {
    const actual = await vi.importActual<typeof import('../api/fetchData')>('../api/fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

vi.mock('../api/settings/apiServerSettings', () => ({
    apiServerSettings: mocks.apiServerSettings,
}));

vi.mock('../utils/adminPortalAccess', () => ({
    hasAdminPortalAccess: mocks.hasAdminPortalAccess,
}));

const loginResponse = {
    access_token: 'access-token',
    expires_in: 300,
    refresh_expires_in: 600,
    refresh_token: 'refresh-token',
};

const renderLoginMutation = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const TestComponent = () => {
        const { mutate } = useLoginMutation('42');

        return (
            <button
                type="button"
                onClick={() =>
                    mutate(
                        {
                            username: 'admin@example.com',
                            password: 'correct-password',
                            otp: '123456',
                        },
                        {
                            onError: mocks.onError,
                            onSuccess: mocks.onSuccess,
                        },
                    )
                }
            >
                Login
            </button>
        );
    };

    return render(
        <QueryClientProvider client={queryClient}>
            <TestComponent />
        </QueryClientProvider>,
    );
};

describe('useLoginMutation', () => {
    beforeEach(() => {
        mocks.apiServerSettings.mockReset();
        mocks.fetchData.mockReset();
        mocks.getAccessToken.mockReset();
        mocks.hasAdminPortalAccess.mockReset();
        mocks.onError.mockReset();
        mocks.onSuccess.mockReset();
        mocks.setServerSettings.mockReset();
        mocks.setTokens.mockReset();

        mocks.getAccessToken.mockResolvedValue(loginResponse);
        mocks.hasAdminPortalAccess.mockReturnValue(true);
        mocks.fetchData.mockResolvedValue({ status: 200 });
        mocks.setTokens.mockResolvedValue(undefined);
    });

    it('calls the login API, checks tenant access, and stores tokens on success', async () => {
        const user = userEvent.setup();
        renderLoginMutation();

        await user.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mocks.onSuccess).toHaveBeenCalledWith(
                loginResponse,
                { username: 'admin@example.com', password: 'correct-password', otp: '123456' },
                undefined,
                expect.anything(),
            );
        });
        expect(mocks.getAccessToken).toHaveBeenCalledWith({
            username: 'admin@example.com',
            password: 'correct-password',
            otp: '123456',
        });
        expect(mocks.fetchData).toHaveBeenCalledWith({
            url: tenantAccessEndpoint,
            method: FETCH_METHODS.GET,
            headersData: {
                Authorization: 'Bearer access-token',
            },
        });
        expect(mocks.setTokens).toHaveBeenCalledWith('access-token', 300, 'refresh-token', 600);
    });

    it('blocks non-admin accounts before checking tenant access', async () => {
        const user = userEvent.setup();
        mocks.hasAdminPortalAccess.mockReturnValue(false);
        renderLoginMutation();

        await user.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mocks.onError).toHaveBeenCalledWith(
                new Error(ADMIN_PORTAL_ACCESS_DENIED),
                { username: 'admin@example.com', password: 'correct-password', otp: '123456' },
                undefined,
                expect.anything(),
            );
        });
        expect(mocks.fetchData).not.toHaveBeenCalled();
        expect(mocks.setTokens).not.toHaveBeenCalled();
    });

    it('reports an unreachable auth server before the tenant access check as TIMEOUT', async () => {
        const user = userEvent.setup();
        mocks.getAccessToken.mockRejectedValue(new Error('TIMEOUT'));
        renderLoginMutation();

        await user.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mocks.onError).toHaveBeenCalledWith(
                new Error('TIMEOUT'),
                { username: 'admin@example.com', password: 'correct-password', otp: '123456' },
                undefined,
                expect.anything(),
            );
        });
        expect(mocks.fetchData).not.toHaveBeenCalled();
        expect(mocks.setTokens).not.toHaveBeenCalled();
    });

    it('reports a denied tenant access check as TENANT_ACCESS_DENIED', async () => {
        const user = userEvent.setup();
        mocks.fetchData.mockRejectedValue(new Error('API call error: 401 Unauthorized'));
        renderLoginMutation();

        await user.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mocks.onError).toHaveBeenCalledWith(
                new Error(TENANT_ACCESS_DENIED),
                expect.anything(),
                undefined,
                expect.anything(),
            );
        });
        expect(mocks.setTokens).not.toHaveBeenCalled();
    });

    it('reports an unreachable server during the tenant access check as TIMEOUT, not access denied', async () => {
        const user = userEvent.setup();
        mocks.fetchData.mockRejectedValue(new Error('TIMEOUT'));
        renderLoginMutation();

        await user.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mocks.onError).toHaveBeenCalledWith(
                new Error('TIMEOUT'),
                expect.anything(),
                undefined,
                expect.anything(),
            );
        });
        expect(mocks.setTokens).not.toHaveBeenCalled();
    });
});
