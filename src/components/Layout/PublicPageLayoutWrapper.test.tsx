import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicPageLayoutWrapper from './PublicPageLayoutWrapper';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import getPublicTenantData from '../../api/tenant/getPublicTenantData';

// Mock only the public GET seam. The query, failure containment and layout are real.
vi.mock('../../api/tenant/getPublicTenantData', () => ({ default: vi.fn(), getPublicTenantDataById: vi.fn() }));

let client: QueryClient;
beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
    cleanup();
    await client.cancelQueries();
    client.clear();
});
const Providers = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const PublicConsumer = () => {
    const { data, isFetching } = usePublicTenantData();
    let label = 'Branding unavailable';
    if (isFetching) label = 'Loading tenant';
    else if (data?.name) label = `Tenant: ${data.name}`;
    return (
        <PublicPageLayoutWrapper hideFooter>
            <h1>Public page</h1>
            <p>{label}</p>
        </PublicPageLayoutWrapper>
    );
};

describe('public layout with its canonical tenant query', () => {
    it('keeps a rejected public GET contained and visible without a second unhandled request', async () => {
        vi.mocked(getPublicTenantData).mockRejectedValue(new Error('Public tenant HTTP500'));
        render(<PublicConsumer />, { wrapper: Providers });
        expect(await screen.findByText('Branding unavailable')).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Public page' })).toBeVisible();
        await waitFor(() => expect(getPublicTenantData).toHaveBeenCalledTimes(1));
    });

    it('renders the successful canonical response without fetching it again from the layout', async () => {
        vi.mocked(getPublicTenantData).mockResolvedValue({
            id: 1,
            name: 'Canonical tenant',
            settings: {},
            licensing: {},
        });
        render(<PublicConsumer />, { wrapper: Providers });
        expect(await screen.findByText('Tenant: Canonical tenant')).toBeVisible();
        await waitFor(() => expect(getPublicTenantData).toHaveBeenCalledTimes(1));
    });
});
