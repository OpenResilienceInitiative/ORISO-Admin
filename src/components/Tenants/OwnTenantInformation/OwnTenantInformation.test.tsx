import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { OwnTenantInformation } from './index';

const mocks = vi.hoisted(() => ({ canUpdateTenant: true, mutate: vi.fn(), refetched: false }));

const { tenant, refetchedTenant } = vi.hoisted(() => {
    const stored = {
        id: 7,
        name: 'Caritas Springfield',
        subdomain: 'springfield',
        licensing: { allowedNumberOfUsers: 5 },
        address: 'Evergreen Terrace 742, 12345 Springfield',
        legalName: 'Caritas Springfield e. V.',
        contactEmail: 'kontakt@springfield.example',
        contactPhone: '+49 30 123456',
        description: 'Beratung für die ganze Familie',
        dataProtectionOfficer: { nameAndLegalForm: 'Datenschutz GmbH', city: 'Springfield' },
    };
    return { tenant: stored, refetchedTenant: { ...stored, address: 'Refetched 9, 99999 Elsewhere' } };
});

vi.mock('../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => mocks.canUpdateTenant }),
}));
vi.mock('../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: mocks.mutate }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({
    useTenantData: () => ({
        isLoading: false,
        data: mocks.refetched ? refetchedTenant : tenant,
    }),
}));

describe('OwnTenantInformation', () => {
    beforeEach(() => {
        mocks.canUpdateTenant = true;
        mocks.mutate.mockReset();
        mocks.refetched = false;
    });

    it('shows what is stored for the Träger', () => {
        render(<OwnTenantInformation />);

        expect(screen.getByText('tenants.add.mainTenantTitle')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Caritas Springfield')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Caritas Springfield e. V.')).toBeInTheDocument();
        expect(screen.getByDisplayValue('kontakt@springfield.example')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+49 30 123456')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Beratung für die ganze Familie')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Datenschutz GmbH')).toBeInTheDocument();
    });

    it('never offers the licence number or subdomain, which belong to the platform admin', () => {
        render(<OwnTenantInformation />);

        expect(screen.queryByText('tenants.add.form.allowedConsultantsLicense.placeholder')).toBeNull();
        expect(screen.queryByText('tenants.add.form.subdomain.placeholder')).toBeNull();
    });

    it('lets a user who may update the Träger change the address and saves only this card’s fields', async () => {
        const user = userEvent.setup();
        render(<OwnTenantInformation />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const address = screen.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield');
        await user.clear(address);
        await user.type(address, 'Ahornweg 1, 10115 Berlin');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(mocks.mutate).toHaveBeenCalledTimes(1);
        const [sent] = mocks.mutate.mock.calls[0];
        expect(sent.address).toBe('Ahornweg 1, 10115 Berlin');
        expect(sent.description).toBe('Beratung für die ganze Familie');
        expect(sent.dataProtectionOfficer).toMatchObject({ nameAndLegalForm: 'Datenschutz GmbH' });
        // The name is edited in its own tile; licence and subdomain are the platform admin's.
        expect(sent).not.toHaveProperty('name');
        expect(sent).not.toHaveProperty('licensing');
        expect(sent).not.toHaveProperty('subdomain');
    });

    it('reopens the card with the entered address when saving fails', async () => {
        const user = userEvent.setup();
        render(<OwnTenantInformation />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const address = screen.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield');
        await user.clear(address);
        await user.type(address, 'Ahornweg 1, 10115 Berlin');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        const [, options] = mocks.mutate.mock.calls[0];
        expect(options).toEqual({ onError: expect.any(Function) });
        expect(address).toBeDisabled();
        act(() => options.onError());
        expect(address).toBeEnabled();
        expect(address).toHaveValue('Ahornweg 1, 10115 Berlin');
    });

    it('keeps what the user is typing when the Träger is refetched while the card is open', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<OwnTenantInformation />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const address = screen.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield');
        await user.clear(address);
        await user.type(address, 'Ahornweg 1, 10115 Berlin');
        mocks.refetched = true;
        rerender(<OwnTenantInformation />);

        expect(address).toHaveValue('Ahornweg 1, 10115 Berlin');
    });

    it('shows refetched Träger data while the card is closed', () => {
        const { rerender } = render(<OwnTenantInformation />);
        mocks.refetched = true;
        rerender(<OwnTenantInformation />);

        expect(screen.getByDisplayValue('Refetched 9, 99999 Elsewhere')).toBeInTheDocument();
    });

    it('offers no edit button to a user who may not update the Träger', () => {
        mocks.canUpdateTenant = false;
        render(<OwnTenantInformation />);

        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
        expect(screen.getByDisplayValue('Evergreen Terrace 742, 12345 Springfield')).toBeDisabled();
    });
});
