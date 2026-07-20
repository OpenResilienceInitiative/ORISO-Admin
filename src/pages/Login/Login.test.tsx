import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

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
    bootstrapAuthSession: () =>
        new Promise(() => {
            // Keep the bootstrap pending so the component stays on the login route.
        }),
    getAccessTokenForRequests: () => '',
}));

vi.mock('../../api/auth/accessSessionLocalStorage', () => ({
    getTokenExpiryFromLocalStorage: () => ({
        accessTokenValidUntilTime: 0,
        refreshTokenValidUntilTime: 0,
    }),
}));

vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: () => false,
        isTechnicalAccount: false,
    }),
}));

vi.mock('../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: undefined }),
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
