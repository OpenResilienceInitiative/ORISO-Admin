import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { FETCH_METHODS } from '../../../../api/fetchData';
import { tenantAdminEndpoint } from '../../../../appConfig';
import { GeneralTenantSettings } from './index';

/**
 * The create path with the real `useAddOrUpdateTenant`: only the HTTP request is mocked, so the test
 * sees the POST body the hook builds from what the form submits.
 */
const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
    subdomainFeature: { finished: false },
}));

vi.mock('../../../../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../api/fetchData')>();
    return { ...actual, fetchData: mocks.fetchData };
});
vi.mock('../../../../config/subdomainFeature', () => ({
    get SUBDOMAINS_TECHNICALLY_FINISHED() {
        return mocks.subdomainFeature.finished;
    },
}));
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'add' }),
}));
// A multi-domain installation: the one where the subdomain field would show if subdomains were finished.
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: false } }),
}));
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../../../hooks/useAddOrUpdateTenantAdmin.hook', () => ({
    useAddOrUpdateTenantAdmin: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../../api/tenant/deleteTenantData', () => ({ deleteTenantData: vi.fn().mockResolvedValue(undefined) }));

const renderCreateForm = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return render(<GeneralTenantSettings />, { wrapper });
};

const fillCreateForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/tenants\.add\.form\.name\.placeholder/), 'Caritas Test');
    await user.type(screen.getByLabelText(/tenants\.add\.form\.allowedConsultantsLicense\.placeholder/), '5');
    await user.type(screen.getByLabelText(/tenantAdmins\.form\.username/), 'traeger-admin');
    await user.type(screen.getByLabelText(/tenantAdmins\.form\.password/), 'SecurePassword1!x');
    await user.type(screen.getByLabelText(/^email/), 'admin@example.org');
    await user.type(screen.getByLabelText(/^firstname/), 'Ada');
    await user.type(screen.getByLabelText(/^lastname/), 'Admin');
};

const postedBody = () => {
    expect(mocks.fetchData).toHaveBeenCalledTimes(1);
    const request = mocks.fetchData.mock.calls[0][0];
    expect(request).toMatchObject({ url: tenantAdminEndpoint, method: FETCH_METHODS.POST });
    return JSON.parse(request.bodyData);
};

describe('Neuen Träger anlegen — the create request carries a subdomain', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ id: 21 });
        mocks.subdomainFeature.finished = false;
    });

    it('posts a subdomain built from the name although the form has no subdomain field', async () => {
        const user = userEvent.setup();
        renderCreateForm();
        expect(screen.queryByLabelText(/tenants\.add\.form\.subdomain\.placeholder/)).not.toBeInTheDocument();
        await fillCreateForm(user);

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalledTimes(1));
        const body = postedBody();
        expect(body.name).toBe('Caritas Test');
        expect(body.subdomain).toMatch(/^caritas-test-\d{6}$/);
    });

    it('posts the typed subdomain once subdomains are technically finished', async () => {
        mocks.subdomainFeature.finished = true;
        const user = userEvent.setup();
        renderCreateForm();
        await fillCreateForm(user);
        await user.type(screen.getByLabelText(/tenants\.add\.form\.subdomain\.placeholder/), 'caritas-eigen');

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(mocks.fetchData).toHaveBeenCalledTimes(1));
        expect(postedBody()).toMatchObject({ name: 'Caritas Test', subdomain: 'caritas-eigen' });
    });
});
