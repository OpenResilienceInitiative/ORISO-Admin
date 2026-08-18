import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedPageLayoutWrapper from './ProtectedPageLayoutWrapper';
import PublicPageLayoutWrapper from './PublicPageLayoutWrapper';

const protectedLayoutSource = readFileSync(resolve(__dirname, './ProtectedPageLayoutWrapper.tsx'), 'utf8');
const publicLayoutSource = readFileSync(resolve(__dirname, './PublicPageLayoutWrapper.tsx'), 'utf8');

vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback ?? key,
        i18n: { language: 'de', resolvedLanguage: 'de' },
    }),
}));
vi.mock('../../api/auth/auth', () => ({ handleTokenRefresh: vi.fn() }));
vi.mock('../../api/auth/logout', () => ({ default: vi.fn() }));
vi.mock('../../api/tenant/getPublicTenantData', () => ({ default: vi.fn() }));
vi.mock('../../config/runtimeConfig', () => ({
    keycloakAuthPath: (path: string) => path,
    runtimeConfig: {
        apiBaseUrl: '',
        appBaseUrl: '',
        matrixBaseUrl: '',
        userServiceOrigin: '',
        agencyServiceOrigin: '',
        tenantServiceOrigin: '',
        consultingTypeServiceOrigin: '',
        csrfWhitelistHeader: '',
        platformVersion: 'v-test',
    },
}));
vi.mock('../../context/FeatureContext', () => ({
    useFeatureContext: () => ({ isEnabled: () => false, toggleFeature: vi.fn() }),
}));
vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: true } }),
}));
vi.mock('../../hooks/useIsDesktopLayout.hook', () => ({ useIsDesktopLayout: () => true }));
vi.mock('../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        language: 'de',
        options: [{ value: 'de', label: '(DE) Deutsch', title: '' }],
        changeLanguage: vi.fn(),
    }),
}));
vi.mock('../../hooks/useReleasesToggle.hook', () => ({ useReleasesToggle: () => ({ isEnabled: () => false }) }));
vi.mock('../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { subdomain: '' } }) }));
vi.mock('../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => false }) }));
vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ hasRole: () => false, isSuperAdmin: false }),
}));
vi.mock('../../utils/getLocationVariables', () => ({ default: () => ({ subdomain: '' }) }));
vi.mock('../AdminMobileNav/MobileNavContext', () => ({ MobileNavProvider: ({ children }: any) => children }));
vi.mock('./AdminMobileNavBar', () => ({ default: () => <nav data-testid="mobile-navigation" /> }));
vi.mock('./AdminSidebar', () => ({ default: () => <nav data-testid="desktop-navigation" /> }));

const renderAtRoute = (children: React.ReactNode) =>
    render(<MemoryRouter initialEntries={['/admin/settings']}>{children}</MemoryRouter>);

describe('Admin layout footer ownership', () => {
    it('keeps SiteFooter on public pages and out of the authenticated shell', () => {
        expect(publicLayoutSource).toContain("import SiteFooter, { type SiteFooterProps } from './SiteFooter';");
        expect(publicLayoutSource).toMatch(/!hideFooter\s*&&\s*<SiteFooter/);

        expect(protectedLayoutSource).not.toContain("import SiteFooter from './SiteFooter';");
        expect(protectedLayoutSource).not.toMatch(/<SiteFooter\b/);
    });

    it('renders legal links, locale, and version on public stage pages', () => {
        renderAtRoute(
            <PublicPageLayoutWrapper footerVariant="stage">
                <main>Public content</main>
            </PublicPageLayoutWrapper>,
        );

        expect(screen.getByRole('menuitem', { name: 'footer.label.imprint' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'footer.label.privacy' })).toBeVisible();
        expect(screen.getByRole('button', { name: /language\.selectAriaLabel/ })).toBeVisible();
        expect(screen.getByText('v-test')).toBeVisible();
    });

    it('omits the footer from authenticated pages', () => {
        renderAtRoute(
            <ProtectedPageLayoutWrapper>
                <main>Protected content</main>
            </ProtectedPageLayoutWrapper>,
        );

        expect(screen.getByText('Protected content')).toBeVisible();
        expect(screen.queryByRole('contentinfo')).toBeNull();
        expect(screen.queryByRole('menuitem', { name: 'footer.label.imprint' })).toBeNull();
    });

    it('honors hideFooter on public pages', () => {
        renderAtRoute(
            <PublicPageLayoutWrapper hideFooter>
                <main>Footerless public content</main>
            </PublicPageLayoutWrapper>,
        );

        expect(screen.getByText('Footerless public content')).toBeVisible();
        expect(screen.queryByRole('contentinfo')).toBeNull();
    });
});
