import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { message } from 'antd';
import { Outlet } from 'react-router-dom';
import i18next from 'i18next';
import type { PropsWithChildren } from 'react';
import { AdminApp } from './AdminApp';
import { queryClient } from './constants/client';
import { UserRole } from './enums/UserRole';
import { setStoryAuth } from './utils/storybook/adminStoryDecorators';
import { clearSessionTokens } from './api/auth/tokenSessionStore';
import { captureTransportFeedback, type TransportFeedback } from './api/transportFeedback';

const PLATFORM_ICON = 'data:image/vnd.microsoft.icon;base64,AAABAAEAICAA';

const mocks = vi.hoisted(() => ({
    getPublicTenantData: vi.fn(),
    apiServerSettings: vi.fn(),
}));

vi.mock('./api/tenant/getPublicTenantData', () => ({ default: mocks.getPublicTenantData }));
vi.mock('./api/settings/apiServerSettings', () => ({ apiServerSettings: mocks.apiServerSettings }));

// The unit under test is where the favicon is mounted in the route tree, not what
// the public pages render, so the routed pages are stubbed out.
vi.mock('./pages/Login/Login', async () => {
    const { useAdminFeedback } = await import('./hooks/useAdminFeedback');
    const { theme, message: staticMessage } = await import('antd');
    const Content = () => {
        const { token } = theme.useToken();
        return <span>Production theme {token.colorPrimary}</span>;
    };
    return {
        Login: () => {
            const feedback = useAdminFeedback();
            const { token } = theme.useToken();
            return (
                <button
                    data-contextual={feedback.message !== staticMessage}
                    data-theme={token.colorPrimary}
                    type="button"
                    onClick={() => feedback.message.success(<Content />)}
                >
                    login page
                </button>
            );
        },
    };
});
// Skip the real session bootstrap and shell, while keeping both production
// route tables, the role permission check and the real denial page mounted.
vi.mock('./router/ProtectedRoute', () => ({
    ProtectedRoute: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./components/Layout/ProtectedPageLayoutWrapper', () => ({
    default: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./components/DpaBlocker/DpaBlockerGate', () => ({
    DpaBlockerGate: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ isLoading: false }),
}));
vi.mock('./hooks/useUserData.hook', () => ({
    useUserData: () => ({ isLoading: false, data: { twoFactorAuth: { isActive: true } } }),
}));
vi.mock('./hooks/useAccountInactivityActivity.hook', () => ({
    useAccountInactivityActivity: () => undefined,
}));
vi.mock('./pages/lazyPages', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./pages/lazyPages')>()),
    LazyTenantSettingsLayout: () => <Outlet />,
    LazyLegalSettingsPage: () => <h1>Tenant legal editor</h1>,
    LazyAgencyPageEdit: () => <h1>Agency editor</h1>,
}));

const iconHrefs = () =>
    Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']")).map((link) =>
        link.getAttribute('href'),
    );

describe('AdminApp', () => {
    beforeEach(async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        mocks.getPublicTenantData.mockReset();
        mocks.apiServerSettings.mockReset();
        mocks.apiServerSettings.mockResolvedValue({
            multitenancyWithSingleDomainEnabled: { value: true, readOnly: true },
            mainTenantSubdomainForSingleDomainMultitenancy: { value: 'online-beratung', readOnly: false },
        });
        document.head.innerHTML = `
            <link rel="icon" href="/admin/favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/admin/favicon-32x32.png" />
        `;
        window.history.pushState({}, '', '/admin/login');
    });

    it('installs contextual feedback inside the production themed provider', async () => {
        mocks.getPublicTenantData.mockResolvedValue({});
        render(<AdminApp />);
        const button = await screen.findByRole('button', { name: 'login page' });
        expect(button).toHaveAttribute('data-contextual', 'true');
        await userEvent.click(button);
        expect(await screen.findByText(`Production theme ${button.getAttribute('data-theme')}`)).toBeInTheDocument();
    });

    it('commits the canonical owner before the bootstrap settings request and retains the loading gate', async () => {
        mocks.getPublicTenantData.mockResolvedValue({});
        let report: TransportFeedback = () => {
            throw new Error('Bootstrap did not begin');
        };
        let finish: (value: object) => void = () => undefined;
        mocks.apiServerSettings.mockImplementationOnce(() => {
            report = captureTransportFeedback();
            return new Promise((resolve) => {
                finish = resolve;
            });
        });
        const staticError = vi.spyOn(message, 'error');
        try {
            render(<AdminApp />);
            await waitFor(() => expect(mocks.apiServerSettings).toHaveBeenCalledTimes(1));
            expect(screen.queryByRole('button', { name: 'login page' })).not.toBeInTheDocument();
            act(() => report({ content: 'Committed bootstrap owner', duration: 0 }));
            expect(await screen.findByText('Committed bootstrap owner')).toBeInTheDocument();
            expect(staticError).not.toHaveBeenCalled();
            await act(async () => {
                finish({});
            });
            expect(await screen.findByRole('button', { name: 'login page' })).toBeInTheDocument();
        } finally {
            staticError.mockRestore();
        }
    });

    it('brands the tab on the anonymous login route, outside the protected tree', async () => {
        mocks.getPublicTenantData.mockResolvedValue({ theming: { favicon: PLATFORM_ICON } });

        render(<AdminApp />);

        await waitFor(() => expect(iconHrefs()).toEqual([PLATFORM_ICON, PLATFORM_ICON]));
    });

    describe('tenant legal settings deep link', () => {
        const tenantLegalPath = '/admin/theme-settings/legal';
        const agencyAdminRoles = [UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin];

        const open = (path: string, roles: UserRole[]) => {
            setStoryAuth(roles, 2);
            window.history.pushState({}, '', path);
            render(<AdminApp />);
        };

        beforeEach(() => mocks.getPublicTenantData.mockResolvedValue({}));
        afterEach(clearSessionTokens);

        it('renders the existing denial page for an agency-only admin', async () => {
            open(tenantLegalPath, agencyAdminRoles);

            expect(
                await screen.findByRole('heading', {
                    name: i18next.t('errorPages.accessDenied.title'),
                }),
            ).toBeInTheDocument();
            expect(window.location.pathname).toBe('/admin/access-denied');
            expect(screen.queryByRole('heading', { name: 'Tenant legal editor' })).not.toBeInTheDocument();
        });

        it.each(
            [[UserRole.TenantAdmin], [UserRole.SingleTenantAdmin], [UserRole.TenantAdmin, ...agencyAdminRoles]].map(
                (roles) => ({ roles }),
            ),
        )('keeps tenant legal settings open for $roles', async ({ roles }) => {
            open(tenantLegalPath, roles);

            expect(await screen.findByRole('heading', { name: 'Tenant legal editor' })).toBeInTheDocument();
            expect(window.location.pathname).toBe(tenantLegalPath);
        });

        it('keeps the agency legal route open for an agency-only admin', async () => {
            const agencyLegalPath = '/admin/agency/3/legal-settings';
            open(agencyLegalPath, agencyAdminRoles);

            expect(await screen.findByRole('heading', { name: 'Agency editor' })).toBeInTheDocument();
            expect(window.location.pathname).toBe(agencyLegalPath);
        });
    });
});
