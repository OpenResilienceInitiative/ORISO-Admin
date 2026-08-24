import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

/**
 * Regression cover for the login-stage language flip (#594 follow-up).
 *
 * Measured on Pre-Dev: `GET /service/tenant/public/online-beratung` answers
 * `content.claim = "Lets make this project running."` — a single, already
 * language-RESOLVED string. TenantService flattens the stored multilingual map
 * server-side (`TenantConverter#getTranslatedStringFromMap`) picking the
 * language from a `lang` cookie and silently falling back to `de`, so the
 * client cannot tell which language it received.
 *
 * The stage rendered `{claim || t('slogan')}`: the localized headline painted
 * first and was then REPLACED when the (serial) settings → tenant request chain
 * resolved. That is both a visible content jump and — because the resolved
 * claim carries no language — a headline in a different language than the rest
 * of the surface, which is what the owner saw (German form + footer, English
 * headline, language menu still on DE).
 *
 * The headline of an operator surface must therefore stay the localized product
 * name and must not change when tenant content arrives.
 */

const tenantData = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'slogan' ? 'Beratung & Hilfe - Verwaltung' : key),
        i18n: { language: 'de' },
    }),
}));

vi.mock('./LoginForm', () => ({
    default: () => <div data-testid="login-form" />,
}));

vi.mock('../../components/Layout/PublicPageLayoutWrapper', () => ({
    default: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
        <main className={className}>{children}</main>
    ),
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
    useUserRoles: () => ({ hasRole: () => false, isTechnicalAccount: false }),
}));

vi.mock('../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: tenantData.current }),
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: { mainTenantSubdomainForSingleDomainMultitenancy: '' },
    }),
}));

/** The exact payload Pre-Dev serves for tenant 1 (`caritas-berlin`). */
const PRE_DEV_TENANT = {
    theming: { logo: null },
    content: { claim: 'Lets make this project running.' },
};

const renderLogin = () =>
    render(
        <MemoryRouter>
            <Login />
        </MemoryRouter>,
    );

const headline = () => document.querySelector('.stage__headline h1')?.textContent;

describe('Login stage language', () => {
    beforeEach(() => {
        tenantData.current = undefined;
    });

    it('keeps the localized headline once tenant content resolves', () => {
        const { rerender } = renderLogin();

        expect(headline()).toBe('Beratung & Hilfe - Verwaltung');

        // The settings → tenant request chain resolves and tenant content lands.
        tenantData.current = PRE_DEV_TENANT;
        rerender(
            <MemoryRouter>
                <Login />
            </MemoryRouter>,
        );

        expect(headline()).toBe('Beratung & Hilfe - Verwaltung');
    });

    it('never shows the language-resolved tenant claim on the operator surface', () => {
        tenantData.current = PRE_DEV_TENANT;

        renderLogin();

        expect(screen.queryByText('Lets make this project running.')).toBeNull();
    });
});
