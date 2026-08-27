import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantFavicon } from './TenantFavicon';

const PLATFORM_ICON = 'data:image/vnd.microsoft.icon;base64,AAABAAEAICAA';
const TENANT_ICON = 'data:image/png;base64,dGVuYW50';

const mocks = vi.hoisted(() => ({
    getPublicTenantData: vi.fn(),
}));

vi.mock('../../api/tenant/getPublicTenantData', () => ({
    default: mocks.getPublicTenantData,
}));

vi.mock('../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: {
            multitenancyWithSingleDomainEnabled: true,
            mainTenantSubdomainForSingleDomainMultitenancy: 'online-beratung',
        },
        setServerSettings: () => undefined,
        setManualSettings: () => undefined,
    }),
}));

const iconHrefs = () =>
    Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']")).map((link) =>
        link.getAttribute('href'),
    );

const renderFavicon = (props: { tenantFavicon?: string } = {}) =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <TenantFavicon {...props} />
        </QueryClientProvider>,
    );

describe('TenantFavicon', () => {
    beforeEach(() => {
        mocks.getPublicTenantData.mockReset();
        document.head.innerHTML = `
            <link rel="icon" href="/admin/favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/admin/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/admin/favicon-16x16.png" />
        `;
    });

    it('applies the platform icon for a visitor who is not signed in', async () => {
        mocks.getPublicTenantData.mockResolvedValue({ theming: { favicon: PLATFORM_ICON } });

        renderFavicon();

        await waitFor(() => expect(iconHrefs()).toEqual([PLATFORM_ICON, PLATFORM_ICON, PLATFORM_ICON]));
    });

    it('lets a tenant icon win over the platform icon', async () => {
        mocks.getPublicTenantData.mockResolvedValue({ theming: { favicon: PLATFORM_ICON } });

        renderFavicon({ tenantFavicon: TENANT_ICON });

        await waitFor(() => expect(iconHrefs()).toEqual([TENANT_ICON, TENANT_ICON, TENANT_ICON]));
    });

    it('keeps the built-in icon when no branding icon is available', async () => {
        mocks.getPublicTenantData.mockResolvedValue({ theming: {} });

        renderFavicon();

        await waitFor(() => expect(mocks.getPublicTenantData).toHaveBeenCalled());
        expect(iconHrefs()).toEqual(['/admin/favicon.ico', '/admin/favicon-32x32.png', '/admin/favicon-16x16.png']);
    });
});
