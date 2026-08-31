import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApp } from './AdminApp';

const PLATFORM_ICON = 'data:image/vnd.microsoft.icon;base64,AAABAAEAICAA';

const mocks = vi.hoisted(() => ({
    getPublicTenantData: vi.fn(),
    apiServerSettings: vi.fn(),
}));

vi.mock('./api/tenant/getPublicTenantData', () => ({ default: mocks.getPublicTenantData }));
vi.mock('./api/settings/apiServerSettings', () => ({ apiServerSettings: mocks.apiServerSettings }));

// The unit under test is where the favicon is mounted in the route tree, not what
// the public pages render, so the routed pages are stubbed out.
vi.mock('./pages/Login/Login', () => ({ Login: () => <div>login page</div> }));
vi.mock('./router/ProtectedRoute', () => ({
    ProtectedRoute: () => <div>protected</div>,
}));

const iconHrefs = () =>
    Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']")).map((link) =>
        link.getAttribute('href'),
    );

describe('AdminApp', () => {
    beforeEach(() => {
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

    it('brands the tab on the anonymous login route, outside the protected tree', async () => {
        mocks.getPublicTenantData.mockResolvedValue({ theming: { favicon: PLATFORM_ICON } });

        render(<AdminApp />);

        await waitFor(() => expect(iconHrefs()).toEqual([PLATFORM_ICON, PLATFORM_ICON]));
    });
});
