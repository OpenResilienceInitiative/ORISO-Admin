import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mocks = vi.hoisted(() => ({
    bootstrapAuthSession: vi.fn(),
    getAccessTokenForRequests: vi.fn(),
    getRefreshTokenForRequests: vi.fn(),
    getTokenExpiryFromLocalStorage: vi.fn(),
    hasAdminPortalAccess: vi.fn(),
    logout: vi.fn(),
}));

vi.mock('../components/Layout/Initialization', () => ({
    Initialization: () => <div>Initializing</div>,
}));

vi.mock('../api/auth/accessSessionLocalStorage', () => ({
    getTokenExpiryFromLocalStorage: mocks.getTokenExpiryFromLocalStorage,
}));

vi.mock('../api/auth/auth', () => ({
    bootstrapAuthSession: mocks.bootstrapAuthSession,
    getAccessTokenForRequests: mocks.getAccessTokenForRequests,
    getRefreshTokenForRequests: mocks.getRefreshTokenForRequests,
}));

vi.mock('../api/auth/logout', () => ({
    default: mocks.logout,
}));

vi.mock('../utils/adminPortalAccess', () => ({
    hasAdminPortalAccess: mocks.hasAdminPortalAccess,
}));

const renderProtectedRoute = () =>
    render(
        <MemoryRouter initialEntries={['/admin/settings']}>
            <Routes>
                <Route
                    path="/admin/settings"
                    element={
                        <ProtectedRoute>
                            <div>Protected content</div>
                        </ProtectedRoute>
                    }
                />
                <Route path="/admin/login" element={<div>Login page</div>} />
            </Routes>
        </MemoryRouter>,
    );

describe('ProtectedRoute', () => {
    beforeEach(() => {
        mocks.bootstrapAuthSession.mockReset();
        mocks.getAccessTokenForRequests.mockReset();
        mocks.getRefreshTokenForRequests.mockReset();
        mocks.getTokenExpiryFromLocalStorage.mockReset();
        mocks.hasAdminPortalAccess.mockReset();
        mocks.logout.mockReset();

        mocks.bootstrapAuthSession.mockResolvedValue(true);
        mocks.getAccessTokenForRequests.mockReturnValue('access-token');
        mocks.getRefreshTokenForRequests.mockReturnValue('refresh-token');
        mocks.getTokenExpiryFromLocalStorage.mockReturnValue({
            accessTokenValidUntilTime: Date.now() + 60_000,
            refreshTokenValidUntilTime: Date.now() + 120_000,
        });
        mocks.hasAdminPortalAccess.mockReturnValue(true);
    });

    it('shows the initialization state while the auth session bootstraps', () => {
        mocks.bootstrapAuthSession.mockReturnValue(new Promise(() => undefined));

        renderProtectedRoute();

        expect(screen.getByText('Initializing')).toBeInTheDocument();
    });

    it('renders protected content when valid admin tokens are available', async () => {
        renderProtectedRoute();

        expect(await screen.findByText('Protected content')).toBeInTheDocument();
        expect(mocks.logout).not.toHaveBeenCalled();
    });

    it('redirects to login when session tokens are missing', async () => {
        mocks.getAccessTokenForRequests.mockReturnValue('');

        renderProtectedRoute();

        expect(await screen.findByText('Login page')).toBeInTheDocument();
        expect(mocks.logout).toHaveBeenCalledWith(true);
    });

    it('redirects to login when the tokens are expired', async () => {
        mocks.getTokenExpiryFromLocalStorage.mockReturnValue({
            accessTokenValidUntilTime: Date.now() - 60_000,
            refreshTokenValidUntilTime: Date.now() - 30_000,
        });

        renderProtectedRoute();

        expect(await screen.findByText('Login page')).toBeInTheDocument();
        expect(mocks.logout).toHaveBeenCalledWith(true);
    });

    it('logs out and redirects when the token has no admin portal access', async () => {
        mocks.hasAdminPortalAccess.mockReturnValue(false);

        renderProtectedRoute();

        await waitFor(() => {
            expect(mocks.logout).toHaveBeenCalledWith(true, '/admin/login');
        });
        expect(screen.getByText('Login page')).toBeInTheDocument();
    });
});
