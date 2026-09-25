import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Login } from './Login';

const session = vi.hoisted(() => ({
    accessToken: '',
    // Valid-until timestamps far in the future; `0` keeps the token invalid.
    validUntil: 0,
    roles: [] as string[],
    tenantData: undefined as any,
}));

vi.mock('./LoginForm', () => ({
    default: () => <div data-testid="login-form" />,
}));

vi.mock('./Stage', () => ({
    default: () => <div data-testid="login-stage" />,
}));

vi.mock('../../components/Layout/PublicPageLayoutWrapper', () => ({
    default: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
        <main className={className}>{children}</main>
    ),
}));

vi.mock('../../components/LanguageSelector', () => ({
    LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock('../../api/auth/auth', () => ({
    bootstrapAuthSession: () => Promise.resolve(),
    getAccessTokenForRequests: () => session.accessToken,
}));

vi.mock('../../api/auth/accessSessionLocalStorage', () => ({
    getTokenExpiryFromLocalStorage: () => ({
        accessTokenValidUntilTime: session.validUntil,
        refreshTokenValidUntilTime: session.validUntil,
    }),
}));

vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: (role: string | string[]) =>
            (Array.isArray(role) ? role : [role]).some((candidate) => session.roles.includes(candidate)),
        isTechnicalAccount: false,
    }),
}));

vi.mock('../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: session.tenantData }),
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: { mainTenantSubdomainForSingleDomainMultitenancy: '' },
    }),
}));

describe('Login responsive layout', () => {
    it('gives the login form almost the full mobile grid width', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>,
        );

        const loginColumn = screen.getByTestId('login-form').parentElement;

        expect(loginColumn).toHaveClass('ant-col-xs-22', 'ant-col-xs-offset-1');
    });
});

describe('Login redirect for an already signed-in admin', () => {
    const renderWithRoutes = () =>
        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin/agency" element={<div data-testid="agency-list" />} />
                    <Route path="/admin/users/consultants" element={<div data-testid="consultants" />} />
                    <Route path="/admin/theme-settings" element={<div data-testid="theme-settings" />} />
                </Routes>
            </MemoryRouter>,
        );

    const signIn = (...roles: string[]) => {
        session.accessToken = 'token';
        session.validUntil = Date.now() + 60_000;
        session.roles = roles;
        session.tenantData = { theming: {} };
    };

    it('lands a Beratungsstellen-Admin on the Beratungsstellen route, not the Träger settings (ORISO-Admin#917)', async () => {
        signIn('restricted-agency-admin', 'user-admin');

        renderWithRoutes();

        await waitFor(() => expect(screen.getByTestId('agency-list')).toBeInTheDocument());
        expect(screen.queryByTestId('theme-settings')).not.toBeInTheDocument();
    });

    it('keeps the Träger admin landing unchanged', async () => {
        signIn('tenant-admin', 'restricted-agency-admin');

        renderWithRoutes();

        await waitFor(() => expect(screen.getByTestId('consultants')).toBeInTheDocument());
    });

    it('keeps the settings landing for admins who are neither', async () => {
        signIn('single-tenant-admin');

        renderWithRoutes();

        await waitFor(() => expect(screen.getByTestId('theme-settings')).toBeInTheDocument());
    });
});
