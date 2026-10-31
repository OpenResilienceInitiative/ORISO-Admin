import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneralTenantSettings } from './index';

type MutationOptions = { onSuccess: (data: unknown, variables: unknown) => void; onError: (error: Error) => void };

const mocks = vi.hoisted(() => ({
    navigate: vi.fn(),
    createTenant: vi.fn(),
    createTenantAdmin: vi.fn(),
    tenantOptions: undefined as MutationOptions | undefined,
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: 'add' }),
}));
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: true } }),
}));
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('../../../../hooks/useAddOrUpdateTenant.hook', () => ({
    useAddOrUpdateTenant: (options: MutationOptions) => {
        mocks.tenantOptions = options;
        return { mutate: mocks.createTenant };
    },
}));
vi.mock('../../../../hooks/useAddOrUpdateTenantAdmin.hook', () => ({
    useAddOrUpdateTenantAdmin: () => ({ mutate: mocks.createTenantAdmin }),
}));
vi.mock('../../../../api/tenant/deleteTenantData', () => ({ deleteTenantData: vi.fn().mockResolvedValue(undefined) }));

const fillCreateForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/tenants\.add\.form\.name\.placeholder/), 'Caritas Test');
    await user.type(screen.getByLabelText(/tenants\.add\.form\.allowedConsultantsLicense\.placeholder/), '5');
    await user.type(screen.getByLabelText(/tenantAdmins\.form\.username/), 'traeger-admin');
    await user.type(screen.getByLabelText(/tenantAdmins\.form\.password/), 'SecurePass1!x');
    await user.type(screen.getByLabelText(/^email/), 'admin@example.org');
    await user.type(screen.getByLabelText(/^firstname/), 'Ada');
    await user.type(screen.getByLabelText(/^lastname/), 'Admin');
};

describe('Neuen Träger anlegen — Save (Admin#1206)', () => {
    beforeEach(() => {
        mocks.createTenant.mockReset();
        mocks.createTenantAdmin.mockReset();
        mocks.navigate.mockReset();
    });

    it('sends one create request for a double click and shows Save as busy while it runs', async () => {
        const user = userEvent.setup();
        render(<GeneralTenantSettings />);
        await fillCreateForm(user);

        await user.dblClick(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(mocks.createTenant).toHaveBeenCalledTimes(1));
        const save = screen.getByRole('button', { name: 'card.edit.save' });
        expect(save).toBeDisabled();
        expect(save).toHaveAttribute('aria-busy', 'true');
        await user.click(save);
        expect(mocks.createTenant).toHaveBeenCalledTimes(1);
    });

    it('keeps Save busy until the first Träger admin is created, too', async () => {
        const user = userEvent.setup();
        render(<GeneralTenantSettings />);
        await fillCreateForm(user);
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(mocks.createTenant).toHaveBeenCalledTimes(1));

        // The tenant POST answered; the admin POST is still running.
        mocks.tenantOptions?.onSuccess({ id: 21 }, mocks.createTenant.mock.calls[0][0]);

        expect(mocks.createTenantAdmin).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'card.edit.save' })).toBeDisabled();
    });

    it('enables Save again after a failed create so the user can correct and retry', async () => {
        const user = userEvent.setup();
        render(<GeneralTenantSettings />);
        await fillCreateForm(user);
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(mocks.createTenant).toHaveBeenCalledTimes(1));

        mocks.tenantOptions?.onError(new Error('boom'));

        await waitFor(() => expect(screen.getByRole('button', { name: 'card.edit.save' })).toBeEnabled());
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(mocks.createTenant).toHaveBeenCalledTimes(2));
    });
});
